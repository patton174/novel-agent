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

function scopeLabel(scope: MemoryScope, tree?: MemoryTreeResponse): string {
  const root = tree?.nodes?.[0]
  return root?.title?.trim() || scope
}

export function useEditorStoryMemory() {
  const [memoryTreeIndex, setMemoryTreeIndex] = useState<MemoryTreeIndex>({})
  const [memoryNodesByScope, setMemoryNodesByScope] = useState<
    Partial<Record<MemoryScope, Record<string, MemoryNodeDTO>>>
  >({})
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState<Date | null>(null)
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)
  const [activeScope, setActiveScope] = useState<MemoryScope | null>(null)

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
    void api
      .getMemoryTreeIndex(targetNovelId)
      .then(async (index) => {
        setMemoryTreeIndex(index)
        const scopes = Object.keys(index)
        setActiveScope((prev) => {
          if (prev && index[prev]) return prev
          return scopes[0] ?? null
        })
        const flatResults = await Promise.all(
          scopes.map(async (scope) => {
            try {
              const flat = await api.getMemoryNodesFlat(targetNovelId, scope)
              return { scope, flat }
            } catch {
              return { scope, flat: [] as MemoryNodeDTO[] }
            }
          }),
        )
        const nodes: Partial<Record<MemoryScope, Record<string, MemoryNodeDTO>>> = {}
        for (const row of flatResults) {
          nodes[row.scope] = Object.fromEntries(row.flat.map((n) => [n.memory_id, n]))
        }
        setMemoryNodesByScope(nodes)
        setMemoryUpdatedAt(new Date())
      })
      .catch(() => {})
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
    refreshStoryMemory,
    triggerAsyncMemoryRefresh,
    openMemoryModal,
    resetStoryMemory,
    countScopeEntries,
  }
}
