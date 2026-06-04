import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ChapterVersion } from '../../types/novel'
import { readHostModePreference, writeHostModePreference } from '../../utils/agentHostMode'
import { toStoredChatMessage } from '../../utils/agentMessagePersist'
import { saveSessionMessages } from '../../utils/chatSessionStore'
import { getOrCreateAgentSessionId } from '../../utils/agentSession'
import { useNovelStore } from '../../stores/novelStore'
import {
  INITIAL_ASSISTANT_MESSAGE,
  type EditorMessage,
} from '../../types/editor'
import type { EditorCenterTab } from '../../components/editor/EditorCenterTabs'
import { useEditorSessions } from './useEditorSessions'
import { useEditorAgentStream } from './useEditorAgentStream'
import { useEditorScroll } from './useEditorScroll'
import { useEditorStoryMemory } from './useEditorStoryMemory'
import { useEditorReindex } from './useEditorReindex'
import { useEditorBootstrap } from './useEditorBootstrap'

export function useEditorPage() {
  const [activeCenterTab, setActiveCenterTab] = useState<EditorCenterTab>('chat')
  const [showCreateNovel, setShowCreateNovel] = useState(false)
  const [storyOutlineCollapsed, setStoryOutlineCollapsed] = useState(false)
  const [versionsExpanded, setVersionsExpanded] = useState(false)
  const [versionPreview, setVersionPreview] = useState<ChapterVersion | null>(null)
  const [messages, setMessages] = useState<EditorMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const [searchParams] = useSearchParams()
  const [inputValue, setInputValue] = useState('')
  const [hostModeEnabled, setHostModeEnabled] = useState(readHostModePreference)

  const landingPromptSeeded = useRef(false)
  useEffect(() => {
    if (landingPromptSeeded.current) return
    const prompt = searchParams.get('prompt')?.trim()
    if (!prompt) return
    landingPromptSeeded.current = true
    setInputValue(prompt)
    setActiveCenterTab('chat')
  }, [searchParams])
  const [hostRunningInBackground, setHostRunningInBackground] = useState(false)

  const agentSessionIdRef = useRef(getOrCreateAgentSessionId())
  const hostModeRef = useRef(hostModeEnabled)
  const isLoadingRef = useRef(false)
  const refreshSessionsRef = useRef<(novelId?: string | null) => void>(() => {})
  const scrollToBottomRef = useRef<(force?: boolean) => void>(() => {})
  const markTitlePendingRef = useRef<(sessionId: string) => void>(() => {})
  const clearTitlePendingRef = useRef<(sessionId: string) => void>(() => {})

  const novels = useNovelStore((s) => s.novels)
  const activeNovelId = useNovelStore((s) => s.activeNovelId)
  const activeChapterId = useNovelStore((s) => s.activeChapterId)
  const chapterContent = useNovelStore((s) => s.chapterContent)
  const chapterDirty = useNovelStore((s) => s.chapterDirty)
  const chapters = useNovelStore((s) => s.chapters)
  const loadNovels = useNovelStore((s) => s.loadNovels)
  const selectNovel = useNovelStore((s) => s.selectNovel)
  const createNovel = useNovelStore((s) => s.createNovel)
  const deleteNovel = useNovelStore((s) => s.deleteNovel)
  const updateChapterContent = useNovelStore((s) => s.updateChapterContent)
  const saveActiveChapter = useNovelStore((s) => s.saveActiveChapter)
  const refreshActiveChapter = useNovelStore((s) => s.refreshActiveChapter)
  const reloadActiveChapterContent = useNovelStore((s) => s.reloadActiveChapterContent)
  const beginAgentChapterStream = useNovelStore((s) => s.beginAgentChapterStream)
  const appendAgentChapterStream = useNovelStore((s) => s.appendAgentChapterStream)
  const markAgentChapterStreamSaving = useNovelStore((s) => s.markAgentChapterStreamSaving)
  const finishAgentChapterStream = useNovelStore((s) => s.finishAgentChapterStream)
  const agentChapterStreaming = useNovelStore((s) => s.agentChapterStreaming)
  const agentChapterStreamTitle = useNovelStore((s) => s.agentChapterStreamTitle)
  const agentChapterStreamPhase = useNovelStore((s) => s.agentChapterStreamPhase)
  const selectChapterAfterAgentWrite = useNovelStore((s) => s.selectChapterAfterAgentWrite)
  const loadChapters = useNovelStore((s) => s.loadChapters)
  const chapterDiffActive = useNovelStore((s) => s.chapterDiffActive)
  const chapterDiffBaseline = useNovelStore((s) => s.chapterDiffBaseline)
  const acceptChapterDiff = useNovelStore((s) => s.acceptChapterDiff)
  const dismissChapterDiff = useNovelStore((s) => s.dismissChapterDiff)
  const activeNovel = novels.find((n) => n.id === activeNovelId) ?? null
  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null

  const persistMessages = useCallback((sessionId: string, list: EditorMessage[]) => {
    saveSessionMessages(sessionId, list.map(toStoredChatMessage))
  }, [])

  const memory = useEditorStoryMemory()
  const reindex = useEditorReindex(activeNovelId)

  const stream = useEditorAgentStream({
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
    refreshSessions: (id) => refreshSessionsRef.current(id),
    markSessionTitlePending: (id) => markTitlePendingRef.current(id),
    clearSessionTitlePending: (id) => clearTitlePendingRef.current(id),
    refreshStoryMemory: memory.refreshStoryMemory,
    refreshActiveChapter,
    reloadActiveChapterContent,
    scrollMessagesToBottom: (force) => scrollToBottomRef.current(force),
    triggerAsyncMemoryRefresh: memory.triggerAsyncMemoryRefresh,
    setActiveCenterTab,
    beginAgentChapterStream,
    appendAgentChapterStream,
    markAgentChapterStreamSaving,
    finishAgentChapterStream,
    selectChapterAfterAgentWrite,
    loadChapters,
  })

  const scrollLive = useEditorScroll(messages, stream.isLoading, activeCenterTab)
  scrollToBottomRef.current = scrollLive.scrollMessagesToBottom

  const sessions = useEditorSessions({
    agentSessionIdRef,
    novels,
    activeNovel,
    activeNovelId,
    isLoading: stream.isLoading,
    setMessages,
    persistMessages,
    abortActiveStream: stream.abortActiveStream,
    setIsLoading: stream.setIsLoading,
    setActiveStreamMessageId: stream.setActiveStreamMessageId,
    closeStreamSockets: stream.closeStreamSockets,
    refreshStoryMemory: memory.refreshStoryMemory,
    onNewChatResetMemory: memory.resetStoryMemory,
    onDeleteNovel: deleteNovel,
  })

  refreshSessionsRef.current = sessions.refreshSessions
  markTitlePendingRef.current = sessions.markSessionTitlePending
  clearTitlePendingRef.current = sessions.clearSessionTitlePending

  useEditorBootstrap({
    messages,
    setMessages,
    persistMessages,
    agentSessionIdRef,
    activeNovelId,
    activeNovel,
    refreshSessions: sessions.refreshSessions,
    bootstrapSessions: sessions.bootstrapSessions,
    hydrateNovelSessions: sessions.hydrateNovelSessions,
    handleNewChatRef: sessions.handleNewChatRef,
    switchSessionRef: sessions.switchSessionRef,
    expandNovel: sessions.expandNovel,
    refreshStoryMemory: memory.refreshStoryMemory,
    loadNovels,
    hostModeEnabled,
    isLoading: stream.isLoading,
    setHostRunningInBackground,
    abortActiveStream: stream.abortActiveStream,
    hostModeRef,
    isLoadingRef,
    runWsRef: stream.runWsRef,
    statusWsRef: stream.statusWsRef,
    statusWsSessionIdRef: stream.statusWsSessionIdRef,
  })

  useEffect(() => {
    hostModeRef.current = hostModeEnabled
  }, [hostModeEnabled])

  useEffect(() => {
    isLoadingRef.current = stream.isLoading
  }, [stream.isLoading])

  useEffect(() => {
    setVersionPreview(null)
  }, [activeChapterId])

  const handleHostModeChange = useCallback((enabled: boolean) => {
    setHostModeEnabled(enabled)
    writeHostModePreference(enabled)
  }, [])

  const hostBannerText =
    hostRunningInBackground || stream.liveStreamMessage?.agentHostGuardMessage
      ? stream.liveStreamMessage?.agentHostGuardMessage
        ?? (hostRunningInBackground
          ? '托管运行中：任务在后台继续，请勿关闭浏览器标签页'
          : '')
      : undefined

  return {
    activeCenterTab,
    setActiveCenterTab,
    showCreateNovel,
    setShowCreateNovel,
    storyOutlineCollapsed,
    setStoryOutlineCollapsed,
    versionsExpanded,
    setVersionsExpanded,
    versionPreview,
    setVersionPreview,
    messages,
    inputValue,
    setInputValue,
    hostModeEnabled,
    handleHostModeChange,
    novels,
    activeNovelId,
    activeChapterId,
    chapterContent,
    chapterDirty,
    chapterDiffActive,
    chapterDiffBaseline,
    acceptChapterDiff,
    dismissChapterDiff,
    selectNovel,
    createNovel,
    updateChapterContent,
    saveActiveChapter,
    refreshActiveChapter,
    activeNovel,
    activeChapter,
    agentChapterStreaming,
    agentChapterStreamTitle,
    agentChapterStreamPhase,
    sessions,
    stream,
    memory,
    scroll: scrollLive,
    reindex,
    hostBannerText,
  }
}
