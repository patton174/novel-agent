import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export interface DashboardSummary {
  novelCount: number
  chapterCount: number
  weeklyWordCount: number
  agentRunCount: number
}

export interface RecentNovel {
  novelId: string
  title: string
  lastChapterId?: string | null
  updatedAt: string | number
}

const EMPTY_SUMMARY: DashboardSummary = {
  novelCount: 0,
  chapterCount: 0,
  weeklyWordCount: 0,
  agentRunCount: 0,
}

export async function fetchSummary(): Promise<DashboardSummary> {
  try {
    const res = await secureFetch('/api/content/auth/dashboard/summary')
    if (!res.ok) {
      return EMPTY_SUMMARY
    }
    const data = await parseResultResponse<Partial<DashboardSummary>>(res)
    if (!data) {
      return EMPTY_SUMMARY
    }
    return { ...EMPTY_SUMMARY, ...data }
  } catch {
    return EMPTY_SUMMARY
  }
}

export interface DashboardNovel {
  id: string
  title: string
  description?: string | null
  genre?: string | null
  style?: string | null
  targetChapterWords: number
  createdAt: number
  updatedAt: number
}

export async function fetchNovels(): Promise<DashboardNovel[]> {
  try {
    const res = await secureFetch('/api/content/auth/novels')
    if (!res.ok) {
      return []
    }
    const data = await parseResultResponse<DashboardNovel[]>(res)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function fetchRecentNovels(): Promise<RecentNovel[]> {
  try {
    const res = await secureFetch('/api/content/auth/dashboard/recent-novels')
    if (!res.ok) {
      return []
    }
    const data = await parseResultResponse<RecentNovel[]>(res)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
