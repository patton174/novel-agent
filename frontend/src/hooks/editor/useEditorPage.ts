import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  buildEditorLocation,
  readEditorSessionId,
  readEditorTab,
  readEditorUrlSnapshot,
} from '@/lib/editorUrlState'
import { adoptAgentSessionId, getOrCreateAgentSessionId } from '../../utils/agentSession'
import type { ChapterVersion } from '../../types/novel'
import { sortChapters } from '../../utils/outlineDrag'
import { APP_MOBILE_MEDIA, matchesAppMobile } from '@/lib/breakpoints'
import { readHostModePreference, writeHostModePreference } from '../../utils/agentHostMode'
import { toStoredChatMessage } from '../../utils/agentMessagePersist'
import { saveSessionMessages } from '../../utils/chatSessionStore'
import { useThemeStore } from '@/stores/themeStore'
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
import i18n from '@/i18n'

export function useEditorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { chapterId: chapterIdParam } = useParams<{ chapterId?: string }>()
  const [searchParams] = useSearchParams()
  const initialUrl = useMemo(
    () => readEditorUrlSnapshot(location.pathname, location.search),
    [location.pathname, location.search],
  )
  const initialSessionId = useMemo(
    () => readEditorSessionId(location.search),
    [location.search],
  )

  const [activeCenterTab, setActiveCenterTab] = useState<EditorCenterTab>(
    () => initialUrl.tab,
  )
  const [showCreateNovel, setShowCreateNovel] = useState(
    () => initialUrl.action === 'create',
  )
  const [storyOutlineCollapsed, setStoryOutlineCollapsed] = useState(() => matchesAppMobile())
  const [versionPreview, setVersionPreview] = useState<ChapterVersion | null>(null)
  const [messages, setMessages] = useState<EditorMessage[]>([INITIAL_ASSISTANT_MESSAGE])
  const preferredSessionIdRef = useRef<string | null>(initialSessionId)
  const urlSyncReadyRef = useRef(false)
  const [inputValue, setInputValue] = useState('')
  const [hostModeEnabled, setHostModeEnabled] = useState(readHostModePreference)

  const landingPromptSeeded = useRef(false)
  const novelParamHandled = useRef(false)
  const chapterParamHandled = useRef(false)
  const memoryParamHandled = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia(APP_MOBILE_MEDIA)
    const onChange = () => {
      if (mq.matches) setStoryOutlineCollapsed(true)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const [hostRunningInBackground, setHostRunningInBackground] = useState(false)

  const agentSessionIdRef = useRef(
    initialSessionId ? adoptAgentSessionId(initialSessionId) : getOrCreateAgentSessionId(),
  )
  const hostModeRef = useRef(hostModeEnabled)
  const isLoadingRef = useRef(false)
  const refreshSessionsRef = useRef<(novelId?: string | null) => void>(() => {})
  const scrollToBottomRef = useRef<(force?: boolean) => void>(() => {})
  const markTitlePendingRef = useRef<(sessionId: string) => void>(() => {})
  const scheduleTitleSyncRef = useRef<(sessionId: string) => void>(() => {})

  const novels = useNovelStore((s) => s.novels)
  const activeNovelId = useNovelStore((s) => s.activeNovelId)
  const selectNovel = useNovelStore((s) => s.selectNovel)
  const activeChapterId = useNovelStore((s) => s.activeChapterId)
  const chapterContent = useNovelStore((s) => s.chapterContent)
  const chapterDirty = useNovelStore((s) => s.chapterDirty)
  const chapters = useNovelStore((s) => s.chapters)
  const loadNovels = useNovelStore((s) => s.loadNovels)
  const createNovel = useNovelStore((s) => s.createNovel)
  const deleteNovel = useNovelStore((s) => s.deleteNovel)
  const updateNovel = useNovelStore((s) => s.updateNovel)
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
  const selectChapter = useNovelStore((s) => s.selectChapter)
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
    scheduleSessionTitleSync: (id) => scheduleTitleSyncRef.current(id),
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

  const prevChapterStreamingRef = useRef(agentChapterStreaming)
  useEffect(() => {
    const wasStreaming = prevChapterStreamingRef.current
    prevChapterStreamingRef.current = agentChapterStreaming
    if (wasStreaming && !agentChapterStreaming && activeCenterTab === 'chat') {
      scrollLive.scrollMessagesToBottom(true)
    }
  }, [agentChapterStreaming, activeCenterTab, scrollLive.scrollMessagesToBottom])

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
  scheduleTitleSyncRef.current = sessions.scheduleSessionTitleSync

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
    preferredSessionIdRef,
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

  useEffect(() => {
    if (landingPromptSeeded.current) return
    const prompt = initialUrl.prompt
    if (!prompt) return
    landingPromptSeeded.current = true
    setInputValue(prompt)
    setActiveCenterTab('chat')
  }, [initialUrl.prompt])

  useEffect(() => {
    if (novelParamHandled.current) return
    const novelId = initialUrl.novelId
    if (!novelId) return
    if (!novels.some((n) => n.id === novelId)) return
    novelParamHandled.current = true
    void selectNovel(novelId)
    const tab = readEditorTab(location.search)
    if (!tab) {
      setActiveCenterTab('story')
    }
  }, [initialUrl.novelId, location.search, novels, selectNovel])

  useEffect(() => {
    if (chapterParamHandled.current) return
    const chapterId = chapterIdParam?.trim()
    if (!chapterId || !activeNovelId) return
    if (!chapters.some((c) => c.id === chapterId)) return
    chapterParamHandled.current = true
    if (activeChapterId !== chapterId) {
      void selectChapter(chapterId)
    }
    setActiveCenterTab('story')
  }, [chapterIdParam, activeNovelId, activeChapterId, chapters, selectChapter])

  useEffect(() => {
    if (memoryParamHandled.current) return
    if (!initialUrl.memoryOpen) return
    memoryParamHandled.current = true
    memory.setMemoryModalOpen(true)
  }, [initialUrl.memoryOpen, memory])

  useEffect(() => {
    urlSyncReadyRef.current = true
  }, [])

  useEffect(() => {
    if (!urlSyncReadyRef.current) return

    const theme = useThemeStore.getState().theme
    const next = buildEditorLocation({
      chapterId: activeChapterId,
      novelId: activeNovelId,
      sessionId: sessions.activeSession,
      tab: activeCenterTab,
      memoryOpen: memory.memoryModalOpen,
      baseSearch: location.search,
      theme,
    })

    if (next.pathname !== location.pathname || next.search !== searchParams.toString()) {
      navigate(next, { replace: true })
    }
  }, [
    activeCenterTab,
    activeChapterId,
    activeNovelId,
    location.pathname,
    location.search,
    memory.memoryModalOpen,
    navigate,
    searchParams,
    sessions.activeSession,
  ])

  /** 移动分屏：进入章节编辑且已有章节时，默认选中第一章（一步开写） */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!matchesAppMobile()) return
    if (activeCenterTab !== 'story') return
    if (!activeNovelId || activeChapterId) return
    const first = sortChapters(chapters)[0]
    if (first) {
      void selectChapter(first.id)
    }
  }, [activeCenterTab, activeNovelId, activeChapterId, chapters, selectChapter])

  const handleHostModeChange = useCallback((enabled: boolean) => {
    setHostModeEnabled(enabled)
    writeHostModePreference(enabled)
  }, [])

  const hostBannerText =
    hostRunningInBackground || stream.liveStreamMessage?.agentHostGuardMessage
      ? stream.liveStreamMessage?.agentHostGuardMessage
        ?? (hostRunningInBackground
          ? i18n.t('editor:chat.hostRunningBanner')
          : '')
      : undefined

  return {
    activeCenterTab,
    setActiveCenterTab,
    showCreateNovel,
    setShowCreateNovel,
    storyOutlineCollapsed,
    setStoryOutlineCollapsed,
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
    updateNovel,
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
