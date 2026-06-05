import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentChoiceOption,
  AgentContextUsage,
  AgentEventEnvelope,
  AgentInteractionPayload,
  AskUserAnswers,
} from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import { isWelcomeOnlyAssistantMessage } from '../../types/editor'
import {
  applyAgentEvent,
  applyChoiceSelection,
  createInitialAgentStreamUiState,
  finalizeAgentMessageContent,
  findPendingInteractionStepId,
  hasPendingUserInteraction,
} from '../../utils/agentStreamState'
import { buildAgentRunTraceJson } from '../../utils/agentTracePersist'
import { deriveAssistantStreamPhase } from '../../utils/agentStreamPhase'
import {
  isChapterContentSideEffect,
  shouldRefreshStoryMemoryAfterTool,
} from '../../utils/agentToolNames'
import { createRafBatcher } from '../../utils/rafBatcher'
import { createStreamPersistDebouncer } from '../../utils/streamPersist'
import { buildAgentHistory } from '../../utils/buildAgentHistory'
import { extractStoryContext } from '../../utils/extractStoryContext'
import {
  api,
  openAgentRunSocket,
  openAgentStatusSocket,
  openAgentStream,
  sendAgentRunAbort,
  sendAgentRunInteraction,
  sendAgentRunPause,
  sendAgentRunResume,
} from '../../utils/api'
import { listSessions, listSessionsByNovel, upsertSession } from '../../utils/chatSessionStore'
import {
  buildSessionTitleFallback,
  sanitizeAssistantSnippetForTitle,
  sessionNeedsGeneratedTitle,
} from '../../utils/sessionTitle'
import type { EditorCenterTab } from '../../components/editor/EditorCenterTabs'
import type { Novel } from '../../types/novel'
import { useNovelStore } from '../../stores/novelStore'
export interface UseEditorAgentStreamOptions {
  messages: EditorMessage[]
  setMessages: React.Dispatch<React.SetStateAction<EditorMessage[]>>
  persistMessages: (sessionId: string, list: EditorMessage[]) => void
  agentSessionIdRef: React.MutableRefObject<string>
  activeNovel: Novel | null
  activeNovelId: string | null
  activeChapterId: string | null
  chapterContent: string
  hostModeEnabled: boolean
  inputValue: string
  setInputValue: (value: string) => void
  refreshSessions: (novelId?: string | null) => void
  markSessionTitlePending?: (sessionId: string) => void
  clearSessionTitlePending?: (sessionId: string) => void
  refreshStoryMemory: (novelId?: string | null) => void
  refreshActiveChapter: () => void | Promise<void>
  reloadActiveChapterContent: () => void | Promise<void>
  scrollMessagesToBottom: (force?: boolean) => void
  triggerAsyncMemoryRefresh: (novelId?: string | null) => void
  setActiveCenterTab: (tab: EditorCenterTab) => void
  beginAgentChapterStream: (payload: { title: string; chapterId?: string | null }) => void
  appendAgentChapterStream: (delta: string) => void
  markAgentChapterStreamSaving: () => void
  finishAgentChapterStream: () => void
  selectChapterAfterAgentWrite: (preferredTitle?: string) => Promise<void>
  loadChapters: (novelId: string) => Promise<void>
}

export function useEditorAgentStream({
  messages,
  setMessages,
  persistMessages,
  agentSessionIdRef,
  activeNovel,
  activeNovelId,
  activeChapterId,
  chapterContent,
  hostModeEnabled,
  inputValue,
  setInputValue,
  refreshSessions,
  markSessionTitlePending,
  clearSessionTitlePending,
  refreshStoryMemory,
  refreshActiveChapter: _refreshActiveChapter,
  reloadActiveChapterContent: _reloadActiveChapterContent,
  scrollMessagesToBottom,
  triggerAsyncMemoryRefresh,
  setActiveCenterTab,
  beginAgentChapterStream,
  appendAgentChapterStream,
  markAgentChapterStreamSaving,
  finishAgentChapterStream,
  selectChapterAfterAgentWrite,
  loadChapters,
}: UseEditorAgentStreamOptions) {
  const agentChapterTitleRef = useRef('')
  /** Write/Edit 走 chapter.stream.* 时标记，在 tool.completed 后再选章/结束流式 */
  const chapterStreamActiveRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeStreamMessageId, setActiveStreamMessageId] = useState<string | null>(null)
  const [thinkPanelOpen, setThinkPanelOpen] = useState<Record<string, boolean>>({})

  const streamAbortRef = useRef<AbortController | null>(null)
  const statusWsRef = useRef<WebSocket | null>(null)
  const statusWsSessionIdRef = useRef<string | null>(null)
  const runWsRef = useRef<WebSocket | null>(null)
  const activeStreamStateRef = useRef(createInitialAgentStreamUiState())
  const liveStreamRef = useRef<{
    messageId: string
    state: ReturnType<typeof createInitialAgentStreamUiState>
  } | null>(null)
  const streamSyncRef = useRef<(() => void) | null>(null)
  /** 最近一次 context.usage（流结束后仍显示在输入区，对齐 CC statusline） */
  const lastContextUsageRef = useRef<AgentContextUsage | undefined>(undefined)
  const [contextUsageVersion, setContextUsageVersion] = useState(0)
  const titleGenerationInFlightRef = useRef<Set<string>>(new Set())
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const abortActiveStream = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    runWsRef.current?.close()
    runWsRef.current = null
  }, [])

  const handleSend = async (overrideText?: string) => {
    const rawText = overrideText ?? inputValue
    if (!rawText.trim() || isLoading) return

    const userText = rawText.trim()

    const userMessage: EditorMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    }

    setMessages((prev) => {
      const withoutWelcome = prev.filter(
        (msg) => !isWelcomeOnlyAssistantMessage(msg, activeNovel),
      )
      const next = [...withoutWelcome, userMessage]
      persistMessages(agentSessionIdRef.current, next)
      return next
    })
    if (!overrideText) {
      setInputValue('')
    }
    abortActiveStream()
    setIsLoading(true)

    const abortController = new AbortController()
    streamAbortRef.current = abortController

    const assistantMessageId = (Date.now() + 1).toString()
    setActiveStreamMessageId(assistantMessageId)
    // 不设默认 false，首轮思考结束后才能走 ThinkBlock 的 autoCollapseWhenDone

    const streamMessage: EditorMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages((prev) => {
      const next = [...prev, streamMessage]
      persistMessages(agentSessionIdRef.current, next)
      return next
    })

    let streamState = createInitialAgentStreamUiState()
    chapterStreamActiveRef.current = false
    const liveBox = { messageId: assistantMessageId, state: streamState }
    liveStreamRef.current = liveBox
    activeStreamStateRef.current = streamState

    const persistDebouncer = createStreamPersistDebouncer(persistMessages, 2000)

    const syncStreamState = () => {
      const state = liveBox.state
      activeStreamStateRef.current = state
      if (state.contextUsage) {
        lastContextUsageRef.current = state.contextUsage
      }
      setMessages((prev) => {
        const next = prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: finalizeAgentMessageContent(state),
                agentThinkText: state.thinkText || undefined,
                agentSteps: state.stepStates.length > 0 ? [...state.stepStates] : undefined,
                agentActiveToolCount: state.activeToolCount,
                agentIsThinking: state.isThinking,
                agentStreamPaused: state.streamPaused,
                agentRunId: state.runId,
                agentHostGuardMessage: state.hostGuardMessage,
                agentStreamPhase: deriveAssistantStreamPhase(state),
                agentStreamError: state.streamError,
                agentAwaitingInteraction: state.awaitingInteraction,
                agentTimeline: state.timeline.length > 0 ? [...state.timeline] : undefined,
                agentTodos: state.todos?.length ? [...state.todos] : undefined,
                agentContextUsage: state.contextUsage,
              }
            : msg,
        )
        persistDebouncer.schedule(agentSessionIdRef.current, next)
        return next
      })
    }

    const batcher = createRafBatcher(() => {
      syncStreamState()
      scrollMessagesToBottom(true)
    })

    streamSyncRef.current = syncStreamState
    syncStreamState()
    scrollMessagesToBottom(true)

    const chapterDeltaBufferRef = { current: '' }
    let chapterFlushRaf: number | null = null
    const flushChapterDeltaBuffer = () => {
      const chunk = chapterDeltaBufferRef.current
      if (!chunk) return
      chapterDeltaBufferRef.current = ''
      appendAgentChapterStream(chunk)
    }
    const scheduleChapterDeltaFlush = () => {
      if (chapterFlushRaf !== null) return
      chapterFlushRaf = requestAnimationFrame(() => {
        chapterFlushRaf = null
        flushChapterDeltaBuffer()
      })
    }

    const handleAgentEvent = (eventName: string, rawData: string) => {
      liveBox.state = applyAgentEvent(liveBox.state, eventName, rawData)
      streamState = liveBox.state
      activeStreamStateRef.current = liveBox.state
      if (eventName === 'stream-end') {
        flushChapterDeltaBuffer()
        if (chapterFlushRaf !== null) {
          cancelAnimationFrame(chapterFlushRaf)
          chapterFlushRaf = null
        }
        batcher.flushNow()
        persistDebouncer.flushNow()
        refreshStoryMemory(activeNovelId)
        const pendingInteraction =
          liveBox.state.awaitingInteraction ||
          hasPendingUserInteraction(liveBox.state.stepStates)
        if (!pendingInteraction) {
          runWsRef.current?.close()
          runWsRef.current = null
        }
        if (hostModeEnabled) {
          setIsLoading(false)
          if (!pendingInteraction && activeStreamMessageId === assistantMessageId) {
            setActiveStreamMessageId(null)
            liveStreamRef.current = null
            streamSyncRef.current = null
          }
        }
        return
      }
      let type: string | undefined
      if (eventName === 'agent-event') {
        try {
          const parsed = JSON.parse(rawData) as AgentEventEnvelope
          type = parsed.type
          if (parsed.type === 'run.started' && parsed.run_id) {
            runWsRef.current?.close()
            void openAgentRunSocket(parsed.run_id).then((ws) => {
              runWsRef.current = ws
            })
          }
          if (parsed.type === 'chapter.stream.started') {
            const title =
              typeof parsed.payload?.title === 'string' ? parsed.payload.title : '章节'
            const chapterId =
              typeof parsed.payload?.chapter_id === 'string'
                ? parsed.payload.chapter_id
                : null
            agentChapterTitleRef.current = title
            chapterStreamActiveRef.current = true
            setActiveCenterTab('story')
            beginAgentChapterStream({ title, chapterId })
          }
          if (parsed.type === 'chapter.stream.delta') {
            const piece =
              typeof parsed.payload?.text === 'string' ? parsed.payload.text : ''
            if (piece) {
              chapterDeltaBufferRef.current += piece
              scheduleChapterDeltaFlush()
            }
          }
          if (parsed.type === 'chapter.stream.completed') {
            flushChapterDeltaBuffer()
            markAgentChapterStreamSaving()
            setActiveCenterTab('story')
          }
          if (parsed.type === 'tool.started') {
            const startedTool =
              typeof parsed.payload?.name === 'string' ? parsed.payload.name : ''
            if (startedTool === 'Write' || startedTool === 'Edit') {
              useNovelStore.getState().snapshotChapterDiffBeforeAgent()
            }
          }
          const toolName =
            typeof parsed.payload?.name === 'string' ? parsed.payload.name : ''
          const isChapterSideEffect =
            parsed.type === 'tool.completed' &&
            isChapterContentSideEffect(
              toolName,
              parsed.payload as Record<string, unknown>,
            )
          if (isChapterSideEffect) {
            if (activeNovelId) {
              void loadChapters(activeNovelId)
            }
            const streamedWrite =
              (toolName === 'Write' || toolName === 'Edit') &&
              chapterStreamActiveRef.current
            if (streamedWrite) {
              chapterStreamActiveRef.current = false
              finishAgentChapterStream()
              void (async () => {
                await selectChapterAfterAgentWrite(agentChapterTitleRef.current)
                setActiveCenterTab('story')
                scrollMessagesToBottom(true)
              })()
            } else {
              void (async () => {
                await selectChapterAfterAgentWrite(agentChapterTitleRef.current)
                if (toolName === 'Write' || toolName === 'Edit') {
                  setActiveCenterTab('story')
                }
              })()
            }
          }
          if (
            parsed.type === 'tool.completed' &&
            toolName &&
            shouldRefreshStoryMemoryAfterTool(
              toolName,
              parsed.payload as Record<string, unknown>,
            )
          ) {
            refreshStoryMemory(activeNovelId)
          }
          if (parsed.type === 'run.completed') {
            finishAgentChapterStream()
            if (activeNovelId) {
              void loadChapters(activeNovelId)
            }
          }
          if (parsed.type === 'run.failed' && hostModeEnabled) {
            const err = String(parsed.payload?.error ?? '')
            if (/peer closed|incomplete chunked/i.test(err)) {
              liveBox.state = {
                ...liveBox.state,
                streamError: undefined,
                hostGuardMessage:
                  '连接中断，任务在后台继续；正在通过托管通道同步进度…',
              }
            }
          }
          if (
            (parsed.type === 'run.completed' || parsed.type === 'run.failed') &&
            liveBox.state.runTerminalAck
          ) {
            setIsLoading(false)
            const stillAwaiting =
              liveBox.state.awaitingInteraction ||
              hasPendingUserInteraction(liveBox.state.stepStates)
            if (!stillAwaiting && activeStreamMessageId === assistantMessageId) {
              setActiveStreamMessageId(null)
              liveStreamRef.current = null
              streamSyncRef.current = null
            }
          }
          if (
            parsed.type === 'tool.completed' &&
            typeof parsed.payload?.name === 'string' &&
            parsed.payload.name === 'output' &&
            parsed.payload?.memory_async === 'scheduled'
          ) {
            triggerAsyncMemoryRefresh(activeNovelId)
          }
        } catch {
          type = undefined
        }
      }
      if (type === 'chapter.stream.delta') {
        batcher.schedule()
      } else if (type === 'message.delta' || type === 'think.delta') {
        batcher.flushNow()
      } else if (type === 'tool.progress') {
        batcher.schedule()
      } else {
        batcher.schedule()
      }
    }

    const handleStatusEvent = (eventName: string, rawData: string) => {
      if (eventName === 'agent-event' && !hostModeEnabled) {
        try {
          const parsed = JSON.parse(rawData) as AgentEventEnvelope
          if (parsed.type !== 'run.recovering') {
            return
          }
        } catch {
          return
        }
      }
      if (eventName === 'agent-event' && rawData.includes('"type":"stream-end"')) {
        handleAgentEvent('stream-end', 'done')
        return
      }
      handleAgentEvent(eventName, rawData)
    }

    const targetSessionId = agentSessionIdRef.current
    const wsClosed =
      !statusWsRef.current ||
      statusWsRef.current.readyState === WebSocket.CLOSING ||
      statusWsRef.current.readyState === WebSocket.CLOSED
    if (statusWsSessionIdRef.current !== targetSessionId || wsClosed) {
      statusWsRef.current?.close()
      void openAgentStatusSocket(targetSessionId, handleStatusEvent).then((ws) => {
        statusWsRef.current = ws
      })
      statusWsSessionIdRef.current = targetSessionId
    }

    const history = buildAgentHistory(
      messagesRef.current
        .filter((m) => m.id !== assistantMessageId)
        .filter((m) => !isWelcomeOnlyAssistantMessage(m, activeNovel))
        .map((m) => ({
          role: m.role,
          content: m.content,
          agentTimeline: m.agentTimeline,
          agentSteps: m.agentSteps,
          agentThinkText: m.agentThinkText,
        })),
      { maxTurns: 24, excludeTrailingUser: true },
    )

    const storyContext =
      chapterContent.trim() || extractStoryContext(messages) || undefined

    let sseDisconnectedEarly = false
    try {
      await openAgentStream(
        {
          message: userText,
          host_mode: hostModeEnabled,
          context_text: storyContext,
          session_id: agentSessionIdRef.current,
          novel_id: activeNovelId ?? undefined,
          chapter_id: activeChapterId ?? undefined,
          history,
        },
        handleAgentEvent,
        { signal: abortController.signal },
      )
      if (
        hostModeEnabled &&
        liveBox.state.runId &&
        !liveBox.state.runTerminalAck &&
        !liveBox.state.isStreamEnded
      ) {
        sseDisconnectedEarly = true
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      const msg = error instanceof Error ? error.message : String(error)
      const peerDropped =
        /incomplete chunked read|peer closed connection/i.test(msg)
      if (hostModeEnabled && liveBox.state.runId && peerDropped) {
        sseDisconnectedEarly = true
        liveBox.state = {
          ...liveBox.state,
          hostGuardMessage:
            '连接中断，任务在后台继续；正在通过托管通道同步进度…',
          streamError: undefined,
        }
        syncStreamState()
      } else {
        const message =
          error instanceof Error
            ? error.message
            : 'AI 服务暂时不可用，请确认本机 Python（:8000）与 PyAI（:8082）已启动，并已登录。'
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: message,
                  agentStreamPhase: 'error' as const,
                  agentStreamError: message,
                }
              : m,
          )
          persistMessages(agentSessionIdRef.current, next)
          return next
        })
      }
    } finally {
      const hostDetached =
        sseDisconnectedEarly ||
        (hostModeEnabled &&
          Boolean(liveBox.state.runId) &&
          !liveBox.state.runTerminalAck &&
          !liveBox.state.isStreamEnded)
      const finalState = liveBox.state
      const sessionId = agentSessionIdRef.current
      if (
        finalState.runId &&
        (finalState.timeline.length > 0 ||
          finalState.stepStates.length > 0 ||
          finalState.thinkText.trim())
      ) {
        void api
          .saveAgentRunTrace(
            sessionId,
            finalState.runId,
            buildAgentRunTraceJson({
              thinkText: finalState.thinkText,
              stepStates: finalState.stepStates,
              timeline: finalState.timeline,
              todos: finalState.todos,
            }),
          )
          .catch(() => {})
      }
      const resolveSessionTitle = (): string => {
        const local = activeNovelId
          ? listSessionsByNovel(activeNovelId)
          : listSessions()
        return local.find((s) => s.id === sessionId)?.title ?? '新对话'
      }
      const applySessionTitle = (title: string) => {
        const clean = title.trim() || '新对话'
        upsertSession({
          id: sessionId,
          title: clean,
          updatedAt: new Date().toISOString(),
          novelId: activeNovelId ?? undefined,
        })
        void api.upsertContentSession(sessionId, clean, activeNovelId ?? undefined).catch(() => {})
        refreshSessions(activeNovelId)
      }
      const currentTitle = resolveSessionTitle()
      const shouldGenerateTitle =
        userText.trim().length > 0 &&
        sessionNeedsGeneratedTitle(currentTitle) &&
        !titleGenerationInFlightRef.current.has(sessionId)
      if (shouldGenerateTitle) {
        titleGenerationInFlightRef.current.add(sessionId)
        markSessionTitlePending?.(sessionId)
        const assistantSnippet = sanitizeAssistantSnippetForTitle(
          finalizeAgentMessageContent(finalState),
        )
        void api
          .generateSessionTitle({
            user_message: userText,
            assistant_snippet: assistantSnippet,
            novel_title: activeNovel?.title,
          })
          .then(({ title }) => {
            if (!sessionNeedsGeneratedTitle(resolveSessionTitle())) return
            const clean = title.trim()
            if (!clean || sessionNeedsGeneratedTitle(clean)) {
              applySessionTitle(
                buildSessionTitleFallback({
                  userMessage: userText,
                  novelTitle: activeNovel?.title,
                }),
              )
              return
            }
            applySessionTitle(clean)
          })
          .catch(() => {
            if (sessionNeedsGeneratedTitle(resolveSessionTitle())) {
              applySessionTitle(
                buildSessionTitleFallback({
                  userMessage: userText,
                  novelTitle: activeNovel?.title,
                }),
              )
            }
          })
          .finally(() => {
            titleGenerationInFlightRef.current.delete(sessionId)
            clearSessionTitlePending?.(sessionId)
          })
      }
      flushChapterDeltaBuffer()
      batcher.flushNow()
      persistDebouncer.flushNow()
      if (finalState.contextUsage) {
        lastContextUsageRef.current = finalState.contextUsage
        setContextUsageVersion((v) => v + 1)
      }
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null
      }
      if (hostDetached) {
        if (!liveBox.state.hostGuardMessage) {
          liveBox.state = {
            ...liveBox.state,
            hostGuardMessage:
              '连接中断，任务在后台继续；正在通过托管通道同步进度…',
            streamError: undefined,
          }
          syncStreamState()
        }
        statusWsRef.current?.close()
        void openAgentStatusSocket(
          agentSessionIdRef.current,
          handleStatusEvent,
        ).then((ws) => {
          statusWsRef.current = ws
        })
        statusWsSessionIdRef.current = agentSessionIdRef.current
      } else {
        setIsLoading(false)
        const stillAwaiting =
          liveBox.state.awaitingInteraction ||
          hasPendingUserInteraction(liveBox.state.stepStates)
        if (!stillAwaiting) {
          setActiveStreamMessageId(null)
          liveStreamRef.current = null
          streamSyncRef.current = null
        }
      }
    }
  }

  const handleStreamPause = useCallback(() => {
    const ws = runWsRef.current
    const runId = activeStreamStateRef.current.runId
    if (ws && runId) {
      sendAgentRunPause(ws, runId)
    }
  }, [])

  const handleStreamResume = useCallback(() => {
    const ws = runWsRef.current
    const runId = activeStreamStateRef.current.runId
    if (ws && runId) {
      sendAgentRunResume(ws, runId)
    }
  }, [])

  const handleStreamAbort = useCallback(() => {
    const ws = runWsRef.current
    const runId = activeStreamStateRef.current.runId
    if (ws && runId) {
      sendAgentRunAbort(ws, runId)
    }
  }, [])

  const submitLiveInteraction = (
    displayChoice: AgentChoiceOption,
    wsPayload: Parameters<typeof sendAgentRunInteraction>[2],
  ) => {
    const live = liveStreamRef.current
    const runId = activeStreamStateRef.current.runId
    const ws = runWsRef.current
    const pendingInteraction =
      live?.state.awaitingInteraction ||
      hasPendingUserInteraction(live?.state.stepStates ?? [])
    if (
      !live ||
      activeStreamMessageId !== live.messageId ||
      !pendingInteraction ||
      !runId
    ) {
      return false
    }

    const deliverInteraction = (socket: WebSocket) => {
      live.state = applyChoiceSelection(
        live.state,
        displayChoice,
        findPendingInteractionStepId(live.state.stepStates),
      )
      activeStreamStateRef.current = live.state
      streamSyncRef.current?.()
      const deliver = () => sendAgentRunInteraction(socket, runId, wsPayload)
      if (socket.readyState === WebSocket.OPEN) {
        deliver()
      } else {
        socket.addEventListener('open', deliver, { once: true })
      }
    }

    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      void openAgentRunSocket(runId).then((opened) => {
        if (!opened) {
          return
        }
        runWsRef.current = opened
        deliverInteraction(opened)
      })
      return true
    }
    deliverInteraction(ws)
    return true
  }

  const handleChoiceSelect = (choice: AgentChoiceOption) => {
    if (
      submitLiveInteraction(choice, {
        type: 'single_select',
        selected: [{
          id: choice.id,
          title: choice.title,
          description: choice.description,
        }],
      })
    ) {
      return
    }
    if (isLoading) return
    void handleSend(`我选择「${choice.title}」`)
  }

  const handleInteractionSubmit = (
    interaction: AgentInteractionPayload,
    payload?: {
      choice?: AgentChoiceOption
      selected?: AgentChoiceOption[]
      customText?: string
      answers?: AskUserAnswers
    },
  ) => {
    if (interaction.type === 'ask_user' && payload?.answers) {
      const lines = Object.entries(payload.answers).flatMap(([qid, answer]) => {
        const question = interaction.questions?.find((q) => q.id === qid)
        const label = question?.prompt ?? qid
        if (answer.input?.trim()) {
          return [`${label}：${answer.input.trim()}`]
        }
        if (answer.selected?.length) {
          return [`${label}：${answer.selected.map((s) => s.title).join('、')}`]
        }
        if (answer.choice) {
          return [`${label}：${answer.choice.title}`]
        }
        return []
      })
      const text = lines.length > 0 ? lines.join('\n') : ''
      if (text && submitLiveInteraction({ id: 'ask_user', title: text, description: '' }, { type: 'user_input', input: text })) {
        return
      }
      return
    }
    if (payload?.choice) {
      const selected = payload.choice
      if (interaction.type === 'confirm') {
        if (isLoading) return
        void handleSend(selected.id === 'yes' ? '确认' : '取消')
        return
      }
      if (
        submitLiveInteraction(selected, {
          type: 'single_select',
          selected: [{
            id: selected.id,
            title: selected.title,
            description: selected.description,
          }],
        })
      ) {
        return
      }
      if (isLoading) return
      void handleSend(`我选择「${selected.title}」`)
      return
    }
    if (interaction.type === 'multi_select' && payload?.selected && payload.selected.length > 0) {
      const titles = payload.selected.map((item) => item.title).join('、')
      const merged: AgentChoiceOption = {
        id: 'multi',
        title: titles,
        description: payload.selected.map((item) => item.description).filter(Boolean).join('；'),
      }
      if (
        submitLiveInteraction(merged, {
          type: 'multi_select',
          selected: payload.selected.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
          })),
        })
      ) {
        return
      }
      if (isLoading) return
      const quoted = payload.selected.map((item) => `「${item.title}」`).join('、')
      void handleSend(`我选择${quoted}`)
      return
    }
    const customText = payload?.customText?.trim()
    if (customText && (interaction.type === 'user_input' || interaction.allow_custom)) {
      const custom: AgentChoiceOption = {
        id: 'custom',
        title: customText,
        description: '',
      }
      if (
        submitLiveInteraction(custom, {
          type: 'user_input',
          input: customText,
        })
      ) {
        return
      }
      if (isLoading) return
      void handleSend(customText)
    }
  }

  const liveStreamMessage = useMemo(
    () => (activeStreamMessageId
      ? messages.find((m) => m.id === activeStreamMessageId)
      : undefined),
    [messages, activeStreamMessageId],
  )

  const composerContextUsage = useMemo((): AgentContextUsage | undefined => {
    if (liveStreamMessage?.agentContextUsage) {
      return liveStreamMessage.agentContextUsage
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === 'assistant' && msg.agentContextUsage) {
        return msg.agentContextUsage
      }
    }
    return lastContextUsageRef.current
  }, [messages, liveStreamMessage, contextUsageVersion])

  const closeStreamSockets = useCallback(() => {
    statusWsRef.current?.close()
    statusWsRef.current = null
    statusWsSessionIdRef.current = null
  }, [])

  return {
    isLoading,
    setIsLoading,
    activeStreamMessageId,
    setActiveStreamMessageId,
    thinkPanelOpen,
    setThinkPanelOpen,
    abortActiveStream,
    closeStreamSockets,
    statusWsRef,
    statusWsSessionIdRef,
    handleSend,
    handleStreamPause,
    handleStreamResume,
    handleStreamAbort,
    handleChoiceSelect,
    handleInteractionSubmit,
    liveStreamMessage,
    composerContextUsage,
    streamAbortRef,
    runWsRef,
  }
}
