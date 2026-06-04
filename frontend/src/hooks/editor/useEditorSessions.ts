import { useCallback, useMemo, useRef, useState } from 'react'
import {
  createWelcomeMessages,
  INITIAL_ASSISTANT_MESSAGE,
  type EditorChatSession,
  type EditorMessage,
  type EditorStoryMemoryState,
  type SessionDialogState,
} from '../../types/editor'
import {
  deleteSession,
  deleteSessions,
  ensureSession,
  listSessions,
  listSessionsByNovel,
  loadSessionMessages,
  renameSession,
  saveSessionMessages,
  upsertSession,
} from '../../utils/chatSessionStore'
import { fromStoredChatMessage } from '../../utils/agentMessagePersist'
import { mergeRemoteWithLocalTrace } from '../../utils/agentMessageReplay'
import { contentMessageToEditorMessage } from '../../utils/contentMessageMap'
import { resetAgentSessionId } from '../../utils/agentSession'
import { api } from '../../utils/api'
import { appToast } from '../../stores/appToastStore'
import type { Novel } from '../../types/novel'

export interface NovelSessionGroup {
  novel: Novel
  sessions: EditorChatSession[]
}

import { emptyNormalizedStoryMemory } from '../../utils/storyMemoryModel'

const emptyMemory = (): EditorStoryMemoryState => emptyNormalizedStoryMemory()

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
  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionDialog, setSessionDialog] = useState<SessionDialogState>(null)
  const [expandedNovelIds, setExpandedNovelIds] = useState<Set<string>>(() => new Set())
  const [batchMode, setBatchMode] = useState(false)
  const [batchNovelId, setBatchNovelId] = useState<string | null>(null)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set())
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
          title: s.title || '新对话',
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
    ensureSession(nextSessionId, '新对话', activeNovelId ?? undefined)
    if (activeNovelId) {
      setExpandedNovelIds(new Set([activeNovelId]))
    }
    const initial = createWelcomeMessages(activeNovel)
    setMessages(initial)
    persistMessages(nextSessionId, initial)
    refreshSessions(activeNovelId)
    onNewChatResetMemory()
    void api.upsertContentSession(nextSessionId, '新对话', activeNovelId ?? undefined).catch(() => {})
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
    agentSessionIdRef.current = sessionId
    setActiveSession(sessionId)
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
    setSessionDialog({ kind: 'rename', sessionId, title: currentTitle })
  }

  const handleDeleteSession = (sessionId: string) => {
    setSessionDialog({ kind: 'delete', sessionId })
  }

  const confirmRenameSession = (nextTitle: string) => {
    if (!sessionDialog || sessionDialog.kind !== 'rename') return
    const updated = renameSession(sessionDialog.sessionId, nextTitle.trim())
    if (!updated) {
      appToast.error('重命名失败')
      return
    }
    refreshSessions(activeNovelId)
    void api
      .upsertContentSession(sessionDialog.sessionId, updated.title, activeNovelId ?? undefined)
      .catch(() => appToast.info('本地已更新，同步到云端失败'))
    setSessionDialog(null)
    appToast.success('对话已重命名')
  }

  const confirmDeleteSession = async () => {
    if (!sessionDialog || sessionDialog.kind !== 'delete') return
    const sessionId = sessionDialog.sessionId
    try {
      await api.deleteContentSession(sessionId)
      deleteSession(sessionId)
      refreshSessions(activeNovelId)
      setSessionDialog(null)
      setSelectedSessionIds((prev) => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
      appToast.success('对话已删除')
      if (sessionId === activeSession) {
        handleNewChat()
        return
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch {
      appToast.error('删除对话失败')
    }
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

  const startBatchForNovel = useCallback((novelId: string) => {
    setBatchNovelId(novelId)
    setBatchMode(true)
    setSelectedSessionIds(new Set())
    setExpandedNovelIds(new Set([novelId]))
  }, [])

  const exitBatchMode = useCallback(() => {
    setBatchMode(false)
    setBatchNovelId(null)
    setSelectedSessionIds(new Set())
  }, [])

  const requestBatchDelete = () => {
    if (selectedSessionIds.size === 0) return
    setSessionDialog({
      kind: 'delete-batch',
      sessionIds: [...selectedSessionIds],
    })
  }

  const handleDeleteNovelRequest = (novelId: string, title: string) => {
    setSessionDialog({ kind: 'delete-novel', novelId, title })
  }

  const confirmDeleteNovel = useCallback(async () => {
    if (!sessionDialog || sessionDialog.kind !== 'delete-novel') return
    const { novelId, title } = sessionDialog
    try {
      await onDeleteNovel(novelId)
      setSessionDialog(null)
      refreshSessions(null)
      exitBatchMode()
      setExpandedNovelIds((prev) => {
        const next = new Set(prev)
        next.delete(novelId)
        return next
      })
      appToast.success(`已删除小说「${title}」`)
    } catch {
      appToast.error('删除小说失败')
    }
  }, [sessionDialog, onDeleteNovel, refreshSessions, exitBatchMode])

  const confirmBatchDeleteSessions = async () => {
    if (!sessionDialog || sessionDialog.kind !== 'delete-batch') return
    const ids = sessionDialog.sessionIds
    try {
      const result = await api.batchDeleteContentSessions(ids)
      if (result.deleted <= 0) {
        appToast.error('云端未删除任何对话，请稍后重试')
        return
      }
      deleteSessions(ids)
      refreshSessions(activeNovelId)
      setSessionDialog(null)
      setSelectedSessionIds(new Set())
      exitBatchMode()
      appToast.success(`已删除 ${result.deleted} 条对话`)
      if (ids.includes(activeSession)) {
        handleNewChat()
        return
      }
      setSessions((prev) => prev.filter((s) => !ids.includes(s.id)))
    } catch {
      appToast.error('批量删除失败')
    }
  }

  const selectAllSessionsInBatch = useCallback(() => {
    if (!batchNovelId) return
    const query =
      activeNovelId === batchNovelId && sessionSearch.trim()
        ? sessionSearch.trim().toLowerCase()
        : ''
    const ids = listSessionsByNovel(batchNovelId)
      .filter((s) => !query || s.title.toLowerCase().includes(query))
      .map((s) => s.id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedSessionIds.has(id))
    if (allSelected) {
      setSelectedSessionIds(new Set())
      return
    }
    setSelectedSessionIds(new Set(ids))
  }, [batchNovelId, activeNovelId, sessionSearch, selectedSessionIds])

  const toggleSessionSelected = useCallback((sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }, [])

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

  const novelSessions = useMemo(() => {
    if (!activeNovelId) return []
    return listSessionsByNovel(activeNovelId).map((s) => ({
      ...s,
      updatedAt: new Date(s.updatedAt),
    }))
  }, [sessions, activeNovelId])

  const activeSessionTitle = useMemo(() => {
    return novelSessions.find((s) => s.id === activeSession)?.title ?? '新对话'
  }, [novelSessions, activeSession])

  const novelSessionGroups = useMemo((): NovelSessionGroup[] => {
    const query =
      activeNovelId && sessionSearch.trim()
        ? sessionSearch.trim().toLowerCase()
        : ''
    return novels.map((novel) => {
      const items = listSessionsByNovel(novel.id)
        .map((s) => ({
          id: s.id,
          title: s.title,
          updatedAt: new Date(s.updatedAt),
        }))
        .filter(
          (s) =>
            !query ||
            novel.id !== activeNovelId ||
            s.title.toLowerCase().includes(query),
        )
      return { novel, sessions: items }
    })
  }, [novels, sessions, sessionSearch, activeNovelId])

  const bootstrapSessions = useCallback(() => {
    const currentId = agentSessionIdRef.current
    const existing = listSessions()
    if (existing.length === 0) {
      ensureSession(currentId, '新对话')
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
    sessionSearch,
    setSessionSearch,
    sessionDialog,
    setSessionDialog,
    expandedNovelIds,
    toggleNovelExpanded,
    expandNovel,
    batchNovelId,
    startBatchForNovel,
    exitBatchMode,
    handleDeleteNovelRequest,
    refreshSessions,
    hydrateNovelSessions,
    handleNewChat,
    handleNewChatRef,
    switchSession,
    switchSessionRef,
    handleRenameSession,
    handleDeleteSession,
    confirmRenameSession,
    confirmDeleteSession,
    confirmDeleteNovel,
    novelSessions,
    activeSessionTitle,
    novelSessionGroups,
    batchMode,
    setBatchMode,
    selectedSessionIds,
    setSelectedSessionIds,
    toggleSessionSelected,
    requestBatchDelete,
    selectAllSessionsInBatch,
    setBatchMode,
    confirmBatchDeleteSessions,
    titlePendingSessionIds,
    markSessionTitlePending,
    clearSessionTitlePending,
    bootstrapSessions,
    emptyMemory,
  }
}
