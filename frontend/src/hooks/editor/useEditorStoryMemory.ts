import { useCallback, useMemo, useState } from 'react'
import { api } from '../../utils/api'
import { useNovelStore } from '../../stores/novelStore'
import type {
  MemoryNodeDTO,
  MemoryRootTab,
  MemoryScope,
  MemoryTreeIndex,
  MemoryTreeResponse,
} from '../../types/memoryNode'

export type MemoryLoadErrorKind = 'tree' | 'flat_all' | 'flat_partial' | null

function scopeLabel(scope: MemoryScope, tree?: MemoryTreeResponse): string {
  const root = tree?.nodes?.[0]
  return root?.title?.trim() || scope
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  if (typeof err === 'string' && err.trim()) return err.trim()
  return 'unknown'
}

export function useEditorStoryMemory() {
  const [memoryTreeIndex, setMemoryTreeIndex] = useState<MemoryTreeIndex>({})
  const [memoryNodesByScope, setMemoryNodesByScope] = useState<
    Partial<Record<MemoryScope, Record<string, MemoryNodeDTO>>>
  >({})
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState<Date | null>(null)
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)
  const [activeScope, setActiveScope] = useState<MemoryScope | null>(null)
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [memoryLoadError, setMemoryLoadError] = useState<MemoryLoadErrorKind>(null)
  const [memoryLoadDetail, setMemoryLoadDetail] = useState<string | null>(null)

  const memoryTabs = useMemo((): MemoryRootTab[] => {
    return Object.entries(memoryTreeIndex).map(([scope, tree]) => {
      const root = tree.nodes?.[0]
      const rootDetail = root ? memoryNodesByScope[scope]?.[root.memory_id] : undefined
      return {
        scope,
        label: scopeLabel(scope, tree),
        count: root?.child_count ?? tree.count ?? 0,
        icon: rootDetail?.style?.icon ?? null,
      }
    })
  }, [memoryTreeIndex, memoryNodesByScope])

  const refreshStoryMemory = useCallback((novelId?: string | null) => {
    const targetNovelId = novelId ?? useNovelStore.getState().activeNovelId
    if (!targetNovelId) return

    setMemoryLoading(true)
    setMemoryLoadError(null)
    setMemoryLoadDetail(null)

    void (async () => {
      try {
        const index = await api.getMemoryTreeIndex(targetNovelId)
        setMemoryTreeIndex(index)
        const scopes = Object.keys(index)
        setActiveScope((prev) => {
          if (prev && index[prev]) return prev
          return scopes[0] ?? null
        })

        if (scopes.length === 0) {
          setMemoryNodesByScope({})
          setMemoryUpdatedAt(new Date())
          return
        }

        const flatResults = await Promise.all(
          scopes.map(async (scope) => {
            try {
              const flat = await api.getMemoryNodesFlat(targetNovelId, scope)
              return { scope, flat, failed: false as const }
            } catch (err) {
              console.error('[memory] flat load failed', { novelId: targetNovelId, scope, err })
              return { scope, flat: [] as MemoryNodeDTO[], failed: true as const, message: errorMessage(err) }
            }
          }),
        )

        const failedScopes = flatResults.filter((row) => row.failed)
        if (failedScopes.length === scopes.length) {
          setMemoryLoadError('flat_all')
          setMemoryLoadDetail(failedScopes[0]?.message ?? null)
        } else if (failedScopes.length > 0) {
          setMemoryLoadError('flat_partial')
          setMemoryLoadDetail(failedScopes.map((row) => row.scope).join(', '))
        }

        const nodes: Partial<Record<MemoryScope, Record<string, MemoryNodeDTO>>> = {}
        for (const row of flatResults) {
          nodes[row.scope] = Object.fromEntries(row.flat.map((n) => [n.memory_id, n]))
        }
        setMemoryNodesByScope(nodes)
        setMemoryUpdatedAt(new Date())
      } catch (err) {
        console.error('[memory] tree-index load failed', { novelId: targetNovelId, err })
        setMemoryLoadError('tree')
        setMemoryLoadDetail(errorMessage(err))
        setMemoryTreeIndex({})
        setMemoryNodesByScope({})
      } finally {
        setMemoryLoading(false)
      }
    })()
  }, [])

  const triggerAsyncMemoryRefresh = useCallback(
    (novelId?: string | null) => {
      refreshStoryMemory(novelId)
      window.setTimeout(() => refreshStoryMemory(novelId), 1200)
      window.setTimeout(() => refreshStoryMemory(novelId), 3000)
    },
    [refreshStoryMemory],
  )

  const openMemoryModal = useCallback(
    (scope?: MemoryScope | null) => {
      if (scope) setActiveScope(scope)
      setMemoryModalOpen(true)
      refreshStoryMemory()
    },
    [refreshStoryMemory],
  )

  const resetStoryMemory = useCallback(() => {
    setMemoryTreeIndex({})
    setMemoryNodesByScope({})
    setActiveScope(null)
    setMemoryLoadError(null)
    setMemoryLoadDetail(null)
  }, [])

  const countScopeEntries = useCallback(
    (scope: MemoryScope): number => memoryTreeIndex[scope]?.count ?? 0,
    [memoryTreeIndex],
  )

  return {
    memoryTreeIndex,
    memoryNodesByScope,
    memoryTabs,
    memoryUpdatedAt,
    memoryModalOpen,
    setMemoryModalOpen,
    activeScope,
    setActiveScope,
    memoryLoading,
    memoryLoadError,
    memoryLoadDetail,
    refreshStoryMemory,
    triggerAsyncMemoryRefresh,
    openMemoryModal,
    resetStoryMemory,
    countScopeEntries,
  }
}
