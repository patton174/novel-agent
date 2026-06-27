import { useCallback, useMemo, useRef, useState } from 'react'
import i18n from '@/i18n'
import { confirmAction, promptDialog } from '../../stores/appDialog'
import {
  deleteSession,
  ensureSession,
  listSessions,
  listSessionsByNovel,
  loadSessionMessages,
  renameSession,
  saveSessionMessages,
  upsertSession,
} from '../../utils/chatSessionStore'
import {
  createWelcomeMessages,
  INITIAL_ASSISTANT_MESSAGE,
  type EditorChatSession,
  type EditorMessage,
} from '../../types/editor'
import { fromStoredChatMessage } from '../../utils/agentMessagePersist'
import { mergeRemoteWithLocalTrace } from '../../utils/agentMessageReplay'
import { contentMessageToEditorMessage } from '../../utils/contentMessageMap'
import { adoptAgentSessionId, resetAgentSessionId } from '../../utils/agentSession'
import { api } from '../../utils/api'
import { appToast } from '../../stores/appToastStore'
import { sessionNeedsGeneratedTitle } from '../../utils/sessionTitle'
import type { Novel } from '../../types/novel'

export interface NovelSessionGroup {
  novel: Novel
  sessions: EditorChatSession[]
}

export interface UseEditorSessionsOptions {
  agentSessionIdRef: React.MutableRefObject<string>
  novels: Novel[]
  activeNovel: Novel | null
  activeNovelId: string | null
  isLoading: boolean
  setMessages: React.Dispatch<React.SetStateAction<EditorMessage[]>>
  persistMessages: (sessionId: string, list: EditorMessage[]) => void
  abortActiveStream: () => void
  setIsLoading: (loading: boolean) => void
  setActiveStreamMessageId: (id: string | null) => void
  closeStreamSockets: () => void
  refreshStoryMemory: (novelId?: string | null) => void
  onNewChatResetMemory: () => void
  onDeleteNovel: (novelId: string) => Promise<void>
}

export function useEditorSessions({
  agentSessionIdRef,
  novels,
  activeNovel,
  activeNovelId,
  isLoading,
  setMessages,
  persistMessages,
  abortActiveStream,
  setIsLoading,
  setActiveStreamMessageId,
  closeStreamSockets,
  refreshStoryMemory,
  onNewChatResetMemory,
  onDeleteNovel,
}: UseEditorSessionsOptions) {
  const [sessions, setSessions] = useState<EditorChatSession[]>([])
  const [activeSession, setActiveSession] = useState(agentSessionIdRef.current)
  const [expandedNovelIds, setExpandedNovelIds] = useState<Set<string>>(() => new Set())
  const [titlePendingSessionIds, setTitlePendingSessionIds] = useState<Set<string>>(() => new Set())

  const switchSessionRef = useRef<(sessionId: string) => void>(() => {})
  const handleNewChatRef = useRef<() => void>(() => {})

  const refreshSessions = useCallback((novelId?: string | null) => {
    const local = novelId ? listSessionsByNovel(novelId) : listSessions()
    setSessions(
      local.map((s) => ({
        ...s,
        updatedAt: new Date(s.updatedAt),
      })),
    )
  }, [])

  const hydrateNovelSessions = useCallback(async (novelId: string) => {
    const localBefore = listSessionsByNovel(novelId)
    try {
      const remote = await api.listNovelSessions(novelId, 50)
      const remoteIds = new Set(remote.map((s) => s.id))
      for (const local of localBefore) {
        if (!remoteIds.has(local.id)) {
          deleteSession(local.id)
        }
      }
      remote.forEach((s) => {
        upsertSession({
          id: s.id,
          title: s.title || i18n.t('editor:session.defaultTitle'),
          updatedAt: new Date(s.updatedAt).toISOString(),
          novelId,
        })
      })
    } catch {
      // keep local
    }
    refreshSessions(novelId)
    return listSessionsByNovel(novelId)
  }, [refreshSessions])

  const handleNewChat = useCallback(() => {
    abortActiveStream()
    setIsLoading(false)
    setActiveStreamMessageId(null)
    const nextSessionId = resetAgentSessionId()
    closeStreamSockets()
    agentSessionIdRef.current = nextSessionId
    setActiveSession(nextSessionId)
    ensureSession(nextSessionId, i18n.t('editor:session.defaultTitle'), activeNovelId ?? undefined)
    if (activeNovelId) {
      setExpandedNovelIds(new Set([activeNovelId]))
    }
    const initial = createWelcomeMessages(activeNovel)
    setMessages(initial)
    persistMessages(nextSessionId, initial)
    refreshSessions(activeNovelId)
    onNewChatResetMemory()
    void api.upsertContentSession(nextSessionId, i18n.t('editor:session.defaultTitle'), activeNovelId ?? undefined).catch(() => {})
  }, [
    abortActiveStream,
    setIsLoading,
    setActiveStreamMessageId,
    closeStreamSockets,
    activeNovel,
    activeNovelId,
    setMessages,
    persistMessages,
    refreshSessions,
    onNewChatResetMemory,
  ])

  handleNewChatRef.current = handleNewChat

  const switchSession = useCallback((sessionId: string) => {
    if (isLoading) return
    closeStreamSockets()
    const adopted = adoptAgentSessionId(sessionId)
    agentSessionIdRef.current = adopted
    setActiveSession(adopted)
    const restoredLocal = loadSessionMessages(sessionId).map(fromStoredChatMessage)
    setMessages(restoredLocal.length > 0 ? restoredLocal : createWelcomeMessages(activeNovel))
    void api.listContentMessages(sessionId, 50)
      .then((remote) => {
        const converted = remote.map((m) => contentMessageToEditorMessage(m))
        const merged = mergeRemoteWithLocalTrace(converted, restoredLocal)
        if (merged.length > 0) {
          setMessages(merged)
          persistMessages(sessionId, merged)
        }
      })
      .catch(() => {})
    refreshStoryMemory(activeNovelId)
  }, [
    isLoading,
    closeStreamSockets,
    activeNovel,
    setMessages,
    persistMessages,
    refreshStoryMemory,
    activeNovelId,
  ])

  switchSessionRef.current = switchSession

  const handleRenameSession = (sessionId: string, currentTitle: string) => {
    void (async () => {
      const value = await promptDialog({
        title: i18n.t('editor:session.renameTitle'),
        defaultValue: currentTitle,
        placeholder: i18n.t('editor:session.renamePlaceholder'),
        confirmLabel: i18n.t('common:save'),
      })
      if (value == null || !value.trim()) return
      const updated = renameSession(sessionId, value.trim())
      if (!updated) {
        appToast.error(i18n.t('editor:session.renameFail'))
        return
      }
      refreshSessions(activeNovelId)
      void api
        .upsertContentSession(sessionId, updated.title, activeNovelId ?? undefined)
        .catch(() => appToast.info(i18n.t('editor:session.syncCloudFail')))
      appToast.success(i18n.t('editor:session.renameSuccess'))
    })()
  }

  const handleDeleteSession = (sessionId: string) => {
    void (async () => {
      if (
        !(await confirmAction({
          title: i18n.t('editor:session.deleteTitle'),
          description: i18n.t('editor:session.deleteDesc'),
          confirmLabel: i18n.t('common:delete'),
          danger: true,
        }))
      ) {
        return
      }
      try {
        await api.deleteContentSession(sessionId)
        deleteSession(sessionId)
        refreshSessions(activeNovelId)
        appToast.success(i18n.t('editor:session.deleteSuccess'))
        if (sessionId === activeSession) {
          handleNewChat()
          return
        }
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } catch {
        appToast.error(i18n.t('editor:session.deleteFail'))
      }
    })()
  }

  const toggleNovelExpanded = useCallback((novelId: string) => {
    setExpandedNovelIds((prev) => {
      if (prev.has(novelId)) return new Set<string>()
      return new Set([novelId])
    })
  }, [])

  const expandNovel = useCallback((novelId: string) => {
    setExpandedNovelIds(new Set([novelId]))
  }, [])

  const performDeleteNovel = async (novelId: string) => {
    const title = novels.find((n) => n.id === novelId)?.title ?? i18n.t('editor:session.novelFallback')
    try {
      await onDeleteNovel(novelId)
      refreshSessions(null)
      setExpandedNovelIds((prev) => {
        const next = new Set(prev)
        next.delete(novelId)
        return next
      })
      appToast.success(i18n.t('editor:session.novelDeleted', { title }))
    } catch {
      appToast.error(i18n.t('editor:session.novelDeleteFail'))
      throw new Error('delete novel failed')
    }
  }

  const markSessionTitlePending = useCallback((sessionId: string) => {
    setTitlePendingSessionIds((prev) => new Set(prev).add(sessionId))
  }, [])

  const clearSessionTitlePending = useCallback((sessionId: string) => {
    setTitlePendingSessionIds((prev) => {
      const next = new Set(prev)
      next.delete(sessionId)
      return next
    })
  }, [])

  const syncSessionTitleFromServer = useCallback(
    async (sessionId: string) => {
      try {
        const remoteList = activeNovelId
          ? await api.listNovelSessions(activeNovelId, 50)
          : await api.listContentSessions(50)
        const remote = remoteList.find((s) => s.id === sessionId)
        if (!remote) return
        upsertSession({
          id: remote.id,
          title: remote.title || i18n.t('editor:session.defaultTitle'),
          updatedAt: new Date(remote.updatedAt).toISOString(),
          novelId: remote.novelId ?? activeNovelId ?? undefined,
        })
        refreshSessions(activeNovelId)
        if (!sessionNeedsGeneratedTitle(remote.title)) {
          clearSessionTitlePending(sessionId)
        }
      } catch {
        // keep local title; retry on next poll
      }
    },
    [activeNovelId, refreshSessions, clearSessionTitlePending],
  )

  const scheduleSessionTitleSync = useCallback(
    (sessionId: string) => {
      for (const delayMs of [1500, 4000, 8000, 15000]) {
        window.setTimeout(() => {
          void syncSessionTitleFromServer(sessionId)
        }, delayMs)
      }
    },
    [syncSessionTitleFromServer],
  )

  const novelSessions = useMemo(() => {
    if (!activeNovelId) return []
    return listSessionsByNovel(activeNovelId).map((s) => ({
      ...s,
      updatedAt: new Date(s.updatedAt),
    }))
  }, [sessions, activeNovelId])

  const activeSessionTitle = useMemo(() => {
    return novelSessions.find((s) => s.id === activeSession)?.title ?? i18n.t('editor:session.defaultTitle')
  }, [novelSessions, activeSession])

  const novelSessionGroups = useMemo((): NovelSessionGroup[] => {
    return novels.map((novel) => {
      const items = listSessionsByNovel(novel.id).map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: new Date(s.updatedAt),
      }))
      return { novel, sessions: items }
    })
  }, [novels, sessions])

  const bootstrapSessions = useCallback(() => {
    const currentId = agentSessionIdRef.current
    const existing = listSessions()
    if (existing.length === 0) {
      ensureSession(currentId, i18n.t('editor:session.defaultTitle'))
    }
    setSessions(
      listSessions().map((s) => ({
        ...s,
        updatedAt: new Date(s.updatedAt),
      })),
    )
    setActiveSession(currentId)

    const storedMessages = loadSessionMessages(currentId).map(fromStoredChatMessage)
    if (storedMessages.length > 0) {
      return storedMessages
    }
    saveSessionMessages(currentId, [
      {
        id: INITIAL_ASSISTANT_MESSAGE.id,
        role: INITIAL_ASSISTANT_MESSAGE.role,
        content: INITIAL_ASSISTANT_MESSAGE.content,
        timestamp: INITIAL_ASSISTANT_MESSAGE.timestamp.toISOString(),
      },
    ])
    return null
  }, [])

  return {
    agentSessionIdRef,
    sessions,
    activeSession,
    expandedNovelIds,
    toggleNovelExpanded,
    expandNovel,
    performDeleteNovel,
    refreshSessions,
    hydrateNovelSessions,
    handleNewChat,
    handleNewChatRef,
    switchSession,
    switchSessionRef,
    handleRenameSession,
    handleDeleteSession,
    novelSessions,
    activeSessionTitle,
    novelSessionGroups,
    titlePendingSessionIds,
    markSessionTitlePending,
    clearSessionTitlePending,
    scheduleSessionTitleSync,
    bootstrapSessions,
  }
}
