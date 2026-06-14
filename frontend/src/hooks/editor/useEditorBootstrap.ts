import { useEffect } from 'react'
import { buildLoginHref, buildReturnPath } from '@/lib/authRedirect'
import { isLoggedIn } from '../../utils/auth'
import { useAuthReady } from '../../security/useAuthReady'
import { api } from '../../utils/api'
import { listSessions, upsertSession } from '../../utils/chatSessionStore'
import { useNovelStore } from '../../stores/novelStore'
import {
  INITIAL_ASSISTANT_MESSAGE,
  type EditorMessage,
} from '../../types/editor'
import type { Novel } from '../../types/novel'
import { buildWelcomeMessage } from '../../utils/buildWelcomeMessage'

export interface UseEditorBootstrapOptions {
  messages: EditorMessage[]
  setMessages: React.Dispatch<React.SetStateAction<EditorMessage[]>>
  persistMessages: (sessionId: string, list: EditorMessage[]) => void
  agentSessionIdRef: React.MutableRefObject<string>
  activeNovelId: string | null
  activeNovel: Novel | null
  refreshSessions: (novelId?: string | null) => void
  bootstrapSessions: () => EditorMessage[] | null
  hydrateNovelSessions: (novelId: string) => Promise<Array<{ id: string }>>
  handleNewChatRef: React.MutableRefObject<() => void>
  switchSessionRef: React.MutableRefObject<(sessionId: string) => void>
  expandNovel: (novelId: string) => void
  refreshStoryMemory: (novelId?: string | null) => void
  loadNovels: () => void | Promise<void>
  preferredSessionIdRef: React.MutableRefObject<string | null>
  hostModeEnabled: boolean
  isLoading: boolean
  setHostRunningInBackground: (v: boolean) => void
  abortActiveStream: () => void
  hostModeRef: React.MutableRefObject<boolean>
  isLoadingRef: React.MutableRefObject<boolean>
  runWsRef: React.MutableRefObject<WebSocket | null>
  statusWsRef: React.MutableRefObject<WebSocket | null>
  statusWsSessionIdRef: React.MutableRefObject<string | null>
}

export function useEditorBootstrap({
  setMessages,
  persistMessages,
  agentSessionIdRef,
  activeNovelId,
  activeNovel,
  refreshSessions,
  bootstrapSessions,
  hydrateNovelSessions,
  handleNewChatRef,
  switchSessionRef,
  expandNovel,
  refreshStoryMemory,
  loadNovels,
  preferredSessionIdRef,
  hostModeEnabled,
  isLoading,
  setHostRunningInBackground,
  abortActiveStream,
  hostModeRef,
  isLoadingRef,
  runWsRef,
  statusWsRef,
  statusWsSessionIdRef,
}: UseEditorBootstrapOptions) {
  const navigate = useNavigate()
  const authReady = useAuthReady()

  useEffect(() => {
    if (!authReady) {
      return
    }
    if (!isLoggedIn()) {
      navigate(buildLoginHref({ returnPath: buildReturnPath() }), { replace: true })
    }
  }, [authReady, navigate])

  useEffect(() => {
    if (!hostModeEnabled || !isLoading) {
      setHostRunningInBackground(false)
      return
    }
    const onVisibility = () => setHostRunningInBackground(document.hidden)
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    onVisibility()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [hostModeEnabled, isLoading, setHostRunningInBackground])

  useEffect(() => () => {
    if (hostModeRef.current && isLoadingRef.current) {
      return
    }
    abortActiveStream()
    statusWsRef.current?.close()
    statusWsRef.current = null
    statusWsSessionIdRef.current = null
    runWsRef.current?.close()
    runWsRef.current = null
  }, [abortActiveStream, hostModeRef, isLoadingRef, runWsRef, statusWsRef, statusWsSessionIdRef])

  useEffect(() => {
    const stored = bootstrapSessions()
    if (stored && stored.length > 0) {
      setMessages(stored)
    }
    void api.listContentSessions(100)
      .then((remote) => {
        remote.forEach((s) => {
          upsertSession({
            id: s.id,
            title: s.title || '新对话',
            updatedAt: new Date(s.updatedAt).toISOString(),
            novelId: s.novelId,
          })
        })
        refreshSessions(useNovelStore.getState().activeNovelId ?? undefined)
      })
      .catch(() => {})
    refreshStoryMemory(useNovelStore.getState().activeNovelId)
    void loadNovels()
  }, [loadNovels])

  useEffect(() => {
    if (!activeNovelId) return
    expandNovel(activeNovelId)
    void hydrateNovelSessions(activeNovelId).then((novelSessionList) => {
      if (novelSessionList.length === 0) {
        const current = listSessions().find((s) => s.id === agentSessionIdRef.current)
        if (current?.novelId !== activeNovelId) {
          handleNewChatRef.current()
        }
        return
      }

      const preferred = preferredSessionIdRef.current?.trim()
      if (preferred) {
        const preferredInList = novelSessionList.find((s) => s.id === preferred)
        if (preferredInList) {
          if (agentSessionIdRef.current !== preferred) {
            switchSessionRef.current(preferred)
          }
          return
        }
      }

      const currentInNovel = novelSessionList.find((s) => s.id === agentSessionIdRef.current)
      if (!currentInNovel) {
        switchSessionRef.current(novelSessionList[0].id)
      }
    })
  }, [activeNovelId, hydrateNovelSessions])

  useEffect(() => {
    if (!activeNovel) return
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].id !== INITIAL_ASSISTANT_MESSAGE.id) {
        return prev
      }
      const welcome = buildWelcomeMessage(activeNovel)
      if (prev[0].content === welcome) {
        return prev
      }
      const next = [{ ...prev[0], content: welcome, timestamp: new Date() }]
      persistMessages(agentSessionIdRef.current, next)
      return next
    })
  }, [activeNovel?.id, activeNovel?.title, activeNovel?.description])
}
