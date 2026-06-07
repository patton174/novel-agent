import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardNovel } from '@/api/dashboardApi'
import { dashboardCache } from './dashboardCacheStore'

const sampleNovel: DashboardNovel = {
  id: 'n1',
  title: '缓存小说',
  targetChapterWords: 3000,
  createdAt: 1,
  updatedAt: 1,
}

describe('dashboardCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    dashboardCache.invalidateAll()
  })

  afterEach(() => {
    vi.useRealTimers()
    dashboardCache.invalidateAll()
  })

  it('returns cached novels within TTL', () => {
    dashboardCache.setNovels([sampleNovel])
    expect(dashboardCache.getNovels()).toEqual([sampleNovel])
  })

  it('expires cache after TTL', () => {
    dashboardCache.setNovels([sampleNovel])
    vi.advanceTimersByTime(61_000)
    expect(dashboardCache.getNovels()).toBeNull()
  })

  it('invalidateAll clears all entries', () => {
    dashboardCache.setNovels([sampleNovel])
    dashboardCache.setSummary({
      novelCount: 1,
      chapterCount: 2,
      weeklyWordCount: 3,
      agentRunCount: 4,
    })
    dashboardCache.invalidateAll()
    expect(dashboardCache.getNovels()).toBeNull()
    expect(dashboardCache.getSummary()).toBeNull()
  })
})
