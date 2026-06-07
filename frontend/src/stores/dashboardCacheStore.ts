import type { DashboardActivity, DashboardNovel, DashboardSummary, RecentNovel } from '@/api/dashboardApi'

const TTL_MS = 60_000

type CacheEntry<T> = { data: T; at: number }

let novelsCache: CacheEntry<DashboardNovel[]> | null = null
let summaryCache: CacheEntry<DashboardSummary> | null = null
let recentCache: CacheEntry<RecentNovel[]> | null = null
let activityCache: CacheEntry<DashboardActivity> | null = null

function fresh<T>(entry: CacheEntry<T> | null): T | null {
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) return null
  return entry.data
}

export const dashboardCache = {
  getNovels(): DashboardNovel[] | null {
    return fresh(novelsCache)
  },
  setNovels(data: DashboardNovel[]): void {
    novelsCache = { data, at: Date.now() }
  },
  getSummary(): DashboardSummary | null {
    return fresh(summaryCache)
  },
  setSummary(data: DashboardSummary): void {
    summaryCache = { data, at: Date.now() }
  },
  getRecentNovels(): RecentNovel[] | null {
    return fresh(recentCache)
  },
  setRecentNovels(data: RecentNovel[]): void {
    recentCache = { data, at: Date.now() }
  },
  getActivity(): DashboardActivity | null {
    return fresh(activityCache)
  },
  setActivity(data: DashboardActivity): void {
    activityCache = { data, at: Date.now() }
  },
  invalidateAll(): void {
    novelsCache = null
    summaryCache = null
    recentCache = null
    activityCache = null
  },
}
