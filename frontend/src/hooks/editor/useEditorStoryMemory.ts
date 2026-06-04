import { useCallback, useMemo, useState } from 'react'
import { api } from '../../utils/api'
import { useNovelStore } from '../../stores/novelStore'
import type { MemoryTabId, StoryMemoryWire } from '../../types/storyMemory'
import { normalizeStoryMemory } from '../../utils/storyMemoryModel'

const emptyWire = (): StoryMemoryWire => ({
  novel: {},
  world: {},
  background: {},
  characters: {},
  chapters: {},
})

export function useEditorStoryMemory() {
  const [memoryWire, setMemoryWire] = useState<StoryMemoryWire>(emptyWire())
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState<Date | null>(null)
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)
  const [memoryTab, setMemoryTab] = useState<MemoryTabId>('world')

  const storyMemory = useMemo(() => normalizeStoryMemory(memoryWire), [memoryWire])

  const refreshStoryMemory = useCallback((novelId?: string | null) => {
    const targetNovelId = novelId ?? useNovelStore.getState().activeNovelId
    if (!targetNovelId) return
    void api.getAgentStoryMemory(targetNovelId)
      .then((res) => {
        setMemoryWire({
          novel: res.memory?.novel ?? {},
          world: res.memory?.world ?? {},
          background: res.memory?.background ?? {},
          characters: res.memory?.characters ?? {},
          chapters: res.memory?.chapters ?? {},
        })
        setMemoryUpdatedAt(new Date())
      })
      .catch(() => {})
  }, [])

  const triggerAsyncMemoryRefresh = useCallback((novelId?: string | null) => {
    refreshStoryMemory(novelId)
    window.setTimeout(() => refreshStoryMemory(novelId), 1200)
    window.setTimeout(() => refreshStoryMemory(novelId), 3000)
  }, [refreshStoryMemory])

  const openMemoryModal = useCallback((tab: MemoryTabId = 'world') => {
    setMemoryTab(tab)
    setMemoryModalOpen(true)
    refreshStoryMemory()
  }, [refreshStoryMemory])

  const resetStoryMemory = useCallback(() => {
    setMemoryWire(emptyWire())
  }, [])

  return {
    storyMemory,
    memoryUpdatedAt,
    memoryModalOpen,
    setMemoryModalOpen,
    memoryTab,
    setMemoryTab,
    refreshStoryMemory,
    triggerAsyncMemoryRefresh,
    openMemoryModal,
    resetStoryMemory,
  }
}
