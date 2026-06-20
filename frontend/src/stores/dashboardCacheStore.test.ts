import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardNovel } from '@/api/dashboardApi'
import type { UsageTrendPoint } from '@/api/billingApi'
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

  it('caches token trends', () => {
    const trend: UsageTrendPoint[] = [{ date: '2026-06-20', tokens: 1234, costMicros: 500 }]
    dashboardCache.setTokenTrends(trend)
    expect(dashboardCache.getTokenTrends()).toEqual(trend)
  })

  it('invalidateAll clears token trends', () => {
    dashboardCache.setTokenTrends([{ date: '2026-06-20', tokens: 1, costMicros: 0 }])
    dashboardCache.invalidateAll()
    expect(dashboardCache.getTokenTrends()).toBeNull()
  })
})
