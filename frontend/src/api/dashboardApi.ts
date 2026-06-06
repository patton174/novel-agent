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
  coverUrl?: string | null
  updatedAt: string | number
}

export interface DashboardActivityDay {
  date: string
  writingWords: number
  agentRuns: number
}

export interface DashboardActivity {
  days: DashboardActivityDay[]
  totalWritingWords: number
  totalAgentRuns: number
}

const EMPTY_ACTIVITY: DashboardActivity = {
  days: [],
  totalWritingWords: 0,
  totalAgentRuns: 0,
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
  coverUrl?: string | null
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

export async function suggestNovelCoverPrompt(
  novelId: string,
  draft?: string,
): Promise<string | null> {
  try {
    const res = await secureFetch(`/api/content/auth/novels/${novelId}/cover/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: draft ?? '' }),
    })
    if (!res.ok) {
      return null
    }
    const data = await parseResultResponse<{ prompt?: string }>(res)
    return data?.prompt?.trim() || null
  } catch {
    return null
  }
}

export async function generateNovelCover(
  novelId: string,
  prompt?: string,
): Promise<DashboardNovel | null> {
  try {
    const res = await secureFetch(`/api/content/auth/novels/${novelId}/cover/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt ?? '' }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => null) as { msg?: string } | null
      throw new Error(errBody?.msg || '封面生成失败')
    }
    return parseResultResponse<DashboardNovel>(res)
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error('封面生成失败')
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

export async function fetchActivity(days = 365): Promise<DashboardActivity> {
  try {
    const res = await secureFetch(`/api/content/auth/dashboard/activity?days=${days}`)
    if (!res.ok) {
      return EMPTY_ACTIVITY
    }
    const data = await parseResultResponse<Partial<DashboardActivity>>(res)
    if (!data || !Array.isArray(data.days)) {
      return EMPTY_ACTIVITY
    }
    return {
      days: data.days,
      totalWritingWords: data.totalWritingWords ?? 0,
      totalAgentRuns: data.totalAgentRuns ?? 0,
    }
  } catch {
    return EMPTY_ACTIVITY
  }
}
