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
import { deriveComposerSpinnerMode } from '../../utils/deriveComposerSpinnerMode'
import {
  isChapterContentSideEffect,
  isChapterStreamTool,
  shouldRefreshStoryMemoryAfterTool,
} from '../../utils/agentToolNames'
import {
  applyStoredRunEvents,
  isResumableAgentRunStatus,
  maxStoredEventSequence,
  parseStoredAgentEvent,
  shouldFollowRunLiveEvents,
} from '../../utils/agentActiveRunResume'
import {
  clearStreamRecoveryBanner,
  isPeerDroppedStreamError,
  isStreamRecoveryBanner,
  resolveAgentHostGuardMessage,
  shouldAttachStreamRecovery,
  STREAM_RECOVERY_BANNER,
} from '../../utils/agentStreamRecovery'
import { shouldOpenRecoverySse } from '../../utils/agentStreamLease'
import { createStreamPersistDebouncer } from '../../utils/streamPersist'
import { createRafBatcher } from '../../utils/rafBatcher'
import { buildAgentHistory } from '../../utils/buildAgentHistory'
import { extractStoryContext } from '../../utils/extractStoryContext'
import {
  api,
  openAgentRunSocket,
  openAgentRunSseStream,
  openAgentStatusSocket,
  openAgentStream,
  sendAgentRunAbort,
  sendAgentRunInteraction,
  sendAgentRunPause,
  sendAgentRunResume,
} from '../../utils/api'
import { listSessions, listSessionsByNovel, loadSessionMessages } from '../../utils/chatSessionStore'
import { sessionNeedsGeneratedTitle } from '../../utils/sessionTitle'
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
  scheduleSessionTitleSync?: (sessionId: string) => void
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
  refreshSessions: _refreshSessions,
  markSessionTitlePending,
  scheduleSessionTitleSync,
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
  /** 写章期间是否切到过 story 面板，用于 run.completed 兜底回聊天区 */
  const chapterStoryTabOpenedRef = useRef(false)
  /** chapter.stream.completed 已完成「存盘 + 回聊天」收尾，避免 tool.completed 重复执行 */
  const chapterWriteFinalizedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSseRecovering, setIsSseRecovering] = useState(false)
  const [activeStreamMessageId, setActiveStreamMessageId] = useState<string | null>(null)
  const [thinkPanelOpen, setThinkPanelOpen] = useState<Record<string, boolean>>({})

  const streamAbortRef = useRef<AbortController | null>(null)
  const streamResumeAbortRef = useRef<AbortController | null>(null)
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
  const sendInFlightRef = useRef(false)
  const streamRecoveryRef = useRef(false)
  const streamRecoveryTimerRef = useRef<number | null>(null)
  const resumeCheckedSessionRef = useRef<string | null>(null)
  const statusWsFollowRunRef = useRef(false)
  const lastPolledSequenceRef = useRef(-1)
  const eventPollTimerRef = useRef<number | null>(null)
  const runEventPollInFlightRef = useRef(false)
  const agentEventHandlerRef = useRef<(eventName: string, rawData: string) => void>(() => {})
  const attachRecoveryRef = useRef<(banner?: string, force?: boolean) => void>(() => {})
  const attachStatusWsFallbackRef = useRef<() => void>(() => {})
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const abortActiveStream = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    streamResumeAbortRef.current?.abort()
    streamResumeAbortRef.current = null
    runWsRef.current?.close()
    runWsRef.current = null
  }, [])

  const clearStreamRecoveryTimer = useCallback(() => {
    if (streamRecoveryTimerRef.current != null) {
      window.clearTimeout(streamRecoveryTimerRef.current)
      streamRecoveryTimerRef.current = null
    }
  }, [])

  const stopRunEventPolling = useCallback(() => {
    if (eventPollTimerRef.current != null) {
      window.clearTimeout(eventPollTimerRef.current)
      eventPollTimerRef.current = null
    }
  }, [])

  const scheduleRunEventPoll = useCallback(
    (delayMs = 1500) => {
      stopRunEventPolling()
      eventPollTimerRef.current = window.setTimeout(() => {
        void pollRunEventsOnceRef.current()
      }, delayMs)
    },
    [stopRunEventPolling],
  )

  const pollRunEventsOnceRef = useRef<() => Promise<void>>(async () => {})

  const endRunLiveFollow = useCallback(() => {
    statusWsFollowRunRef.current = false
    stopRunEventPolling()
  }, [stopRunEventPolling])

  pollRunEventsOnceRef.current = async () => {
    const live = liveStreamRef.current
    if (!live) {
      return
    }
    const state = live.state
    if (!shouldFollowRunLiveEvents(state) && !streamRecoveryRef.current) {
      stopRunEventPolling()
      return
    }
    const runId = state.runId
    if (!runId || runEventPollInFlightRef.current) {
      scheduleRunEventPoll()
      return
    }
    runEventPollInFlightRef.current = true
    try {
      const rows = await api.fetchAgentRunEvents(runId, lastPolledSequenceRef.current)
      if (rows.length > 0) {
        for (const row of rows.sort((a, b) => a.sequence - b.sequence)) {
          const envelope = parseStoredAgentEvent(row.payloadJson)
          if (!envelope) {
            continue
          }
          agentEventHandlerRef.current('agent-event', JSON.stringify(envelope))
          lastPolledSequenceRef.current = Math.max(lastPolledSequenceRef.current, row.sequence)
        }
        streamSyncRef.current?.()
        scrollMessagesToBottom(true)
      }
      const nextState = liveStreamRef.current?.state
      if (nextState && (shouldFollowRunLiveEvents(nextState) || streamRecoveryRef.current)) {
        scheduleRunEventPoll()
      }
    } catch {
      const nextState = liveStreamRef.current?.state
      if (nextState && (shouldFollowRunLiveEvents(nextState) || streamRecoveryRef.current)) {
        scheduleRunEventPoll(2500)
      }
    } finally {
      runEventPollInFlightRef.current = false
    }
  }

  const finishStreamRecovery = useCallback(() => {
    streamRecoveryRef.current = false
    setIsSseRecovering(false)
    clearStreamRecoveryTimer()
    streamResumeAbortRef.current?.abort()
    streamResumeAbortRef.current = null
    stopRunEventPolling()
    const live = liveStreamRef.current
    if (live) {
      live.state = clearStreamRecoveryBanner(live.state)
      streamSyncRef.current?.()
    }
  }, [clearStreamRecoveryTimer, stopRunEventPolling])

  const dismissRecoveryOverlay = useCallback(() => {
    if (!streamRecoveryRef.current && !isSseRecovering) {
      return
    }
    setIsSseRecovering(false)
    const live = liveStreamRef.current
    if (live) {
      live.state = clearStreamRecoveryBanner(live.state)
      streamSyncRef.current?.()
    }
  }, [isSseRecovering])

  const wrapRecoveryEventHandler = useCallback(
    (handler: (eventName: string, rawData: string) => void) =>
      (eventName: string, rawData: string) => {
        if (eventName === 'stream-end') {
          dismissRecoveryOverlay()
        } else if (eventName === 'agent-event') {
          try {
            const parsed = JSON.parse(rawData) as AgentEventEnvelope
            if (parsed.type === 'gateway.connected') {
              dismissRecoveryOverlay()
            }
          } catch {
            // ignore malformed frames
          }
        }
        handler(eventName, rawData)
      },
    [dismissRecoveryOverlay],
  )

  const startRunSseRecovery = useCallback(
    (banner?: string, force = false) => {
      const live = liveStreamRef.current
      const runId = live?.state.runId
      const sessionId = agentSessionIdRef.current
      if (!runId && !sessionId) {
        return
      }
      if (streamRecoveryRef.current && streamResumeAbortRef.current) {
        return
      }
      if (!live) {
        return
      }
      if (!shouldOpenRecoverySse(streamAbortRef.current)) {
        statusWsFollowRunRef.current = true
        scheduleRunEventPoll(500)
        return
      }
      if (!force && !shouldAttachStreamRecovery(live.state) && !streamRecoveryRef.current) {
        return
      }
      streamRecoveryRef.current = true
      setIsSseRecovering(true)
      live.state = {
        ...live.state,
        hostGuardMessage: banner ?? live.state.hostGuardMessage ?? STREAM_RECOVERY_BANNER,
        streamError: undefined,
      }
      streamSyncRef.current?.()
      streamResumeAbortRef.current?.abort()
      const resumeAbort = new AbortController()
      streamResumeAbortRef.current = resumeAbort
      const onEvent = wrapRecoveryEventHandler((eventName, rawData) =>
        agentEventHandlerRef.current(eventName, rawData),
      )
      const resumePromise = runId
        ? openAgentRunSseStream(runId, onEvent, {
            signal: resumeAbort.signal,
            afterSequence: lastPolledSequenceRef.current,
            sessionId,
          })
        : openAgentStream(
            {
              message: '',
              session_id: sessionId,
              after_sequence: lastPolledSequenceRef.current,
            },
            onEvent,
            { signal: resumeAbort.signal },
          )
      void resumePromise
        .then(() => {
          if (!streamRecoveryRef.current) {
            return
          }
          finishStreamRecovery()
          endRunLiveFollow()
          setIsLoading(false)
          const stillAwaiting =
            live.state.awaitingInteraction ||
            hasPendingUserInteraction(live.state.stepStates)
          if (!stillAwaiting) {
            setActiveStreamMessageId((current) => (current === live.messageId ? null : current))
            liveStreamRef.current = null
            streamSyncRef.current = null
          }
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }
          clearStreamRecoveryTimer()
          streamRecoveryTimerRef.current = window.setTimeout(() => {
            if (streamRecoveryRef.current && liveStreamRef.current?.state.runId) {
              attachRecoveryRef.current()
            }
          }, 2500)
          attachStatusWsFallbackRef.current()
        })
    },
    [finishStreamRecovery, endRunLiveFollow, wrapRecoveryEventHandler],
  )

  useEffect(() => {
    attachRecoveryRef.current = startRunSseRecovery
  }, [startRunSseRecovery])

  const handleSend = async (overrideText?: string) => {
    const rawText = overrideText ?? inputValue
    if (!rawText.trim() || isLoading || sendInFlightRef.current) return

    sendInFlightRef.current = true
    const userText = rawText.trim()
    const sessionIdAtSend = agentSessionIdRef.current
    const localSessions = activeNovelId ? listSessionsByNovel(activeNovelId) : listSessions()
    const titleAtSend = localSessions.find((s) => s.id === sessionIdAtSend)?.title ?? '新对话'
    if (userText && sessionNeedsGeneratedTitle(titleAtSend)) {
      markSessionTitlePending?.(sessionIdAtSend)
    }

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
    endRunLiveFollow()
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
        const targetIndex =
          prev.length > 0 && prev[prev.length - 1]?.id === assistantMessageId
            ? prev.length - 1
            : prev.findIndex((msg) => msg.id === assistantMessageId)
        if (targetIndex < 0) {
          return prev
        }
        const current = prev[targetIndex]
        const nextContent = finalizeAgentMessageContent(state)
        const nextThinkText = state.thinkText || undefined
        const nextSteps = state.stepStates.length > 0 ? state.stepStates : undefined
        const nextTimeline = state.timeline.length > 0 ? state.timeline : undefined
        const nextTodos = state.todos?.length ? state.todos : undefined
        const nextPhase = deriveAssistantStreamPhase(state)
        const nextHostGuard = resolveAgentHostGuardMessage(state)
        const unchanged =
          current.content === nextContent &&
          current.agentThinkText === nextThinkText &&
          current.agentSteps === nextSteps &&
          current.agentActiveToolCount === state.activeToolCount &&
          current.agentIsThinking === state.isThinking &&
          current.agentStreamPaused === state.streamPaused &&
          current.agentRunId === state.runId &&
          current.agentHostGuardMessage === nextHostGuard &&
          current.agentStreamPhase === nextPhase &&
          current.agentStreamError === state.streamError &&
          current.agentAwaitingInteraction === state.awaitingInteraction &&
          current.agentTimeline === nextTimeline &&
          current.agentTodos === nextTodos &&
          current.agentContextUsage === state.contextUsage
        if (unchanged) {
          return prev
        }
        const next = [...prev]
        next[targetIndex] = {
          ...current,
          content: nextContent,
          agentThinkText: nextThinkText,
          agentSteps: nextSteps,
          agentActiveToolCount: state.activeToolCount,
          agentIsThinking: state.isThinking,
          agentStreamPaused: state.streamPaused,
          agentRunId: state.runId,
          agentHostGuardMessage: nextHostGuard,
          agentStreamPhase: nextPhase,
          agentStreamError: state.streamError,
          agentAwaitingInteraction: state.awaitingInteraction,
          agentTimeline: nextTimeline,
          agentTodos: nextTodos,
          agentContextUsage: state.contextUsage,
        }
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

    const returnToChatAfterChapterWrite = () => {
      chapterStoryTabOpenedRef.current = false
      setActiveCenterTab('chat')
      scrollMessagesToBottom(true)
    }

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
        if (streamRecoveryRef.current) {
          finishStreamRecovery()
        }
        endRunLiveFollow()
        setIsLoading(false)
        if (!pendingInteraction && activeStreamMessageId === assistantMessageId) {
          setActiveStreamMessageId(null)
          liveStreamRef.current = null
          streamSyncRef.current = null
        }
        return
      }
      let type: string | undefined
      if (eventName === 'agent-event') {
        try {
          const parsed = JSON.parse(rawData) as AgentEventEnvelope
          type = parsed.type
          if (
            streamRecoveryRef.current &&
            (parsed.type === 'gateway.connected' ||
              (parsed.type && parsed.type !== 'run.recovering'))
          ) {
            dismissRecoveryOverlay()
          }
          if (parsed.type === 'run.started' && parsed.run_id) {
            runWsRef.current?.close()
            void openAgentRunSocket(parsed.run_id).then((ws) => {
              runWsRef.current = ws
            })
          }
          if (parsed.type === 'run.recovering') {
            statusWsFollowRunRef.current = true
            scheduleRunEventPoll(500)
            if (shouldOpenRecoverySse(streamAbortRef.current)) {
              attachRecoveryRef.current(STREAM_RECOVERY_BANNER, true)
            }
          }
          if (typeof parsed.sequence === 'number') {
            lastPolledSequenceRef.current = Math.max(
              lastPolledSequenceRef.current,
              parsed.sequence,
            )
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
            chapterStoryTabOpenedRef.current = true
            chapterWriteFinalizedRef.current = false
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
            // 章节正文已落库（StreamingChapterAppender 在流式期间持续写入），
            // 此处即为「写完」的明确信号：存盘选章 + 回到聊天界面。
            // 仅做一次，tool.completed / run.completed 走兜底（见下）。
            if (chapterStreamActiveRef.current && !chapterWriteFinalizedRef.current) {
              chapterWriteFinalizedRef.current = true
              chapterStreamActiveRef.current = false
              finishAgentChapterStream()
              void (async () => {
                await selectChapterAfterAgentWrite(agentChapterTitleRef.current)
                returnToChatAfterChapterWrite()
              })()
            }
          }
          if (parsed.type === 'tool.started') {
            const startedTool =
              typeof parsed.payload?.name === 'string' ? parsed.payload.name : ''
            if (isChapterStreamTool(startedTool)) {
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
            // chapter.stream.completed 已完成存盘 + 回聊天，此处仅兜底；
            // 未走流式（无 chapter.stream.*）的 Write/Edit 仍按原逻辑选章。
            if (!chapterWriteFinalizedRef.current) {
              const streamedWrite =
                isChapterStreamTool(toolName) && chapterStreamActiveRef.current
              if (streamedWrite) {
                chapterWriteFinalizedRef.current = true
                chapterStreamActiveRef.current = false
                finishAgentChapterStream()
                void (async () => {
                  await selectChapterAfterAgentWrite(agentChapterTitleRef.current)
                  returnToChatAfterChapterWrite()
                })()
              } else {
                void (async () => {
                  await selectChapterAfterAgentWrite(agentChapterTitleRef.current)
                  if (isChapterStreamTool(toolName)) {
                    returnToChatAfterChapterWrite()
                  }
                })()
              }
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
            if (chapterStoryTabOpenedRef.current) {
              returnToChatAfterChapterWrite()
            }
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
      if (
        type === 'message.delta' ||
        type === 'think.delta' ||
        type === 'reasoning.delta' ||
        type === 'narration.delta'
      ) {
        batcher.flushNow()
      } else if (
        type === 'tool.started' ||
        type === 'tool.completed' ||
        type === 'run.completed' ||
        type === 'run.failed' ||
        type === 'run.recovering'
      ) {
        batcher.flushNow()
      } else if (
        type === 'tool.progress' ||
        type === 'chapter.stream.started' ||
        type === 'chapter.stream.completed'
      ) {
        batcher.flushNow()
      } else {
        // chapter.stream.delta 等高频事件走 rAF 合并：章节正文已由
        // chapterDeltaBufferRef 单独 rAF 批量追加，写章期间聊天面板不可见，
        // 无需每条 delta 同步 flushNow 重算消息列表 + 滚动
        batcher.schedule()
      }
    }

    agentEventHandlerRef.current = handleAgentEvent

    const attachStatusWsFallback = () => {
      statusWsRef.current?.close()
      statusWsSessionIdRef.current = null
      void openAgentStatusSocket(agentSessionIdRef.current, handleStatusEvent, {
        onClose: () => {
          if (!streamRecoveryRef.current && !shouldAttachStreamRecovery(liveBox.state)) {
            return
          }
          clearStreamRecoveryTimer()
          streamRecoveryTimerRef.current = window.setTimeout(() => {
            startRunSseRecovery()
          }, 2000)
        },
      }).then((ws) => {
        statusWsRef.current = ws
        statusWsSessionIdRef.current = agentSessionIdRef.current
      })
      scheduleRunEventPoll(500)
    }
    attachStatusWsFallbackRef.current = attachStatusWsFallback

    const handleStatusEvent = (eventName: string, rawData: string) => {
      if (eventName === 'agent-event' && rawData.includes('"type":"stream-end"')) {
        finishStreamRecovery()
        handleAgentEvent('stream-end', 'done')
        return
      }
      if (eventName !== 'agent-event') {
        return
      }
      let parsedType: string | undefined
      try {
        const parsed = JSON.parse(rawData) as AgentEventEnvelope
        parsedType = parsed.type
      } catch {
        return
      }
      const recoveryActive = streamRecoveryRef.current
      const followRun =
        statusWsFollowRunRef.current && shouldFollowRunLiveEvents(liveBox.state)
      if (!recoveryActive && parsedType !== 'run.recovering' && !followRun) {
        return
      }
      if (parsedType === 'run.recovering') {
        statusWsFollowRunRef.current = true
        scheduleRunEventPoll(500)
        if (shouldOpenRecoverySse(streamAbortRef.current)) {
          attachRecoveryRef.current(STREAM_RECOVERY_BANNER, true)
        }
      }
      handleAgentEvent(eventName, rawData)
      if (recoveryActive && parsedType && parsedType !== 'run.recovering') {
        dismissRecoveryOverlay()
      }
      if (
        recoveryActive &&
        (parsedType === 'run.completed' ||
          parsedType === 'run.failed' ||
          liveBox.state.runTerminalAck ||
          liveBox.state.isStreamEnded)
      ) {
        finishStreamRecovery()
        endRunLiveFollow()
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

    const persistedTurns = loadSessionMessages(agentSessionIdRef.current)
    const persistedById = new Map(persistedTurns.map((m) => [m.id, m]))
    const history = buildAgentHistory(
      messagesRef.current
        .filter((m) => m.id !== assistantMessageId)
        .filter((m) => !isWelcomeOnlyAssistantMessage(m, activeNovel))
        .map((m) => {
          const stored = persistedById.get(m.id)
          return {
            role: m.role,
            content: m.content || stored?.content || '',
            agentTimeline: m.agentTimeline ?? stored?.agentTimeline,
            agentSteps: m.agentSteps ?? stored?.agentSteps,
            agentThinkText: m.agentThinkText ?? stored?.agentThinkText,
          }
        }),
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
      if (shouldAttachStreamRecovery(liveBox.state)) {
        sseDisconnectedEarly = true
      } else if (
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
        isPeerDroppedStreamError(msg)
      if (liveBox.state.runId && peerDropped && shouldAttachStreamRecovery(liveBox.state)) {
        sseDisconnectedEarly = true
        liveBox.state = {
          ...liveBox.state,
          hostGuardMessage: STREAM_RECOVERY_BANNER,
          streamError: undefined,
        }
        syncStreamState()
      } else if (liveBox.state.runId && peerDropped) {
        sseDisconnectedEarly = true
        liveBox.state = {
          ...liveBox.state,
          hostGuardMessage: STREAM_RECOVERY_BANNER,
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
      sendInFlightRef.current = false
      const hostDetached = sseDisconnectedEarly
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
      if (userText.trim().length > 0) {
        scheduleSessionTitleSync?.(sessionId)
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
            hostGuardMessage: STREAM_RECOVERY_BANNER,
            streamError: undefined,
          }
          syncStreamState()
        }
        startRunSseRecovery(STREAM_RECOVERY_BANNER)
      } else {
        finishStreamRecovery()
        endRunLiveFollow()
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
    void contextUsageVersion
    return lastContextUsageRef.current
  }, [messages, liveStreamMessage, contextUsageVersion])

  const composerSpinnerMode = useMemo(() => {
    return deriveComposerSpinnerMode({
      streamActive: isLoading,
      streamPhase: liveStreamMessage?.agentStreamPhase,
      isThinking: liveStreamMessage?.agentIsThinking,
      hasStreamingText: Boolean(liveStreamMessage?.content?.trim()),
    })
  }, [isLoading, liveStreamMessage])

  const closeStreamSockets = useCallback(() => {
    endRunLiveFollow()
    statusWsRef.current?.close()
    statusWsRef.current = null
    statusWsSessionIdRef.current = null
  }, [endRunLiveFollow])

  useEffect(() => {
    const sessionId = agentSessionIdRef.current
    if (!sessionId || isLoading || resumeCheckedSessionRef.current === sessionId) {
      return
    }
    resumeCheckedSessionRef.current = sessionId
    void (async () => {
      try {
        if (sendInFlightRef.current || liveStreamRef.current || streamAbortRef.current) {
          return
        }
        const active = await api.fetchActiveAgentRun(sessionId)
        if (!active?.id || !isResumableAgentRunStatus(active.status)) {
          return
        }
        if (
          sendInFlightRef.current ||
          liveStreamRef.current ||
          streamAbortRef.current ||
          agentSessionIdRef.current !== sessionId
        ) {
          return
        }
        const assistantMessageId = `assistant-resume-${active.id}`
        let streamState = createInitialAgentStreamUiState()
        streamState = { ...streamState, runId: active.id }
        const events = await api.fetchAgentRunEvents(active.id, -1)
        streamState = applyStoredRunEvents(streamState, events)
        lastPolledSequenceRef.current = maxStoredEventSequence(events, -1)
        if (
          streamState.isStreamEnded ||
          streamState.runTerminalAck ||
          !isResumableAgentRunStatus(active.status)
        ) {
          return
        }
        const liveBox = { messageId: assistantMessageId, state: streamState }
        liveStreamRef.current = liveBox
        const syncResumedStream = () => {
          const state = liveBox.state
          activeStreamStateRef.current = state
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantMessageId)
            if (idx < 0) {
              return prev
            }
            const current = prev[idx]
            const next = [...prev]
            next[idx] = {
              ...current,
              content: finalizeAgentMessageContent(state),
              agentThinkText: state.thinkText || undefined,
              agentSteps: state.stepStates.length > 0 ? state.stepStates : undefined,
              agentTimeline: state.timeline.length > 0 ? state.timeline : undefined,
              agentTodos: state.todos?.length ? state.todos : undefined,
              agentRunId: active.id,
              agentHostGuardMessage: resolveAgentHostGuardMessage(state),
              agentStreamPhase: deriveAssistantStreamPhase(state),
              agentAwaitingInteraction: state.awaitingInteraction,
            }
            return next
          })
        }
        streamSyncRef.current = syncResumedStream
        agentEventHandlerRef.current = wrapRecoveryEventHandler((eventName, rawData) => {
          liveBox.state = applyAgentEvent(liveBox.state, eventName, rawData)
          activeStreamStateRef.current = liveBox.state
          if (eventName === 'stream-end') {
            finishStreamRecovery()
            endRunLiveFollow()
            setIsLoading(false)
          }
          if (eventName === 'agent-event') {
            try {
              const parsed = JSON.parse(rawData) as AgentEventEnvelope
              if (typeof parsed.sequence === 'number') {
                lastPolledSequenceRef.current = Math.max(
                  lastPolledSequenceRef.current,
                  parsed.sequence,
                )
              }
              if (
                parsed.type === 'run.completed' ||
                parsed.type === 'run.failed' ||
                liveBox.state.runTerminalAck
              ) {
                finishStreamRecovery()
                endRunLiveFollow()
                setIsLoading(false)
              }
            } catch {
              // ignore malformed replay frames
            }
          }
          syncResumedStream()
        })
        setIsLoading(true)
        setActiveStreamMessageId(assistantMessageId)
        setMessages((prev) => {
          const existing = prev.find((m) => m.id === assistantMessageId)
          const resumed: EditorMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: finalizeAgentMessageContent(streamState),
            timestamp: new Date(),
            agentThinkText: streamState.thinkText || undefined,
            agentSteps: streamState.stepStates.length > 0 ? streamState.stepStates : undefined,
            agentTimeline: streamState.timeline.length > 0 ? streamState.timeline : undefined,
            agentTodos: streamState.todos?.length ? streamState.todos : undefined,
            agentRunId: active.id,
            agentHostGuardMessage: STREAM_RECOVERY_BANNER,
            agentStreamPhase: deriveAssistantStreamPhase(streamState),
            agentAwaitingInteraction: streamState.awaitingInteraction,
          }
          if (existing) {
            return prev.map((m) => (m.id === assistantMessageId ? resumed : m))
          }
          return [...prev, resumed]
        })
        startRunSseRecovery(STREAM_RECOVERY_BANNER)
      } catch {
        resumeCheckedSessionRef.current = null
      }
    })()
  }, [
    agentSessionIdRef,
    isLoading,
    setMessages,
    startRunSseRecovery,
    finishStreamRecovery,
    endRunLiveFollow,
    wrapRecoveryEventHandler,
  ])

  return {
    isLoading,
    setIsLoading,
    isSseRecovering,
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
    composerSpinnerMode,
    streamAbortRef,
    runWsRef,
  }
}
