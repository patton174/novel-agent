import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export type CrawlJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface CrawlJob {
  id: string
  sourceUrl: string
  siteId?: string | null
  title?: string | null
  status: CrawlJobStatus
  createdByAdminId?: number | null
  catalogNovelId?: string | null
  chaptersTotal?: number | null
  chaptersDone?: number | null
  configJson?: string | null
  errorMessage?: string | null
  startedAt: number
  completedAt: number
  createdAt: number
  updatedAt: number
}

export interface CrawlJobPage {
  list: CrawlJob[]
  totalCount: number
  pageCurrent: number
  pageSize: number
}

export interface CrawlPreviewResult {
  ok: boolean
  title?: string
  author?: string
  chapter_count?: number
  sample_chapters?: Array<{ title: string; url: string }>
  message?: string
  goal_summary?: string
}

export type CrawlLogLevel = 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'

export interface CrawlLogEntry {
  seq: number
  level: CrawlLogLevel | string
  message: string
  ts: number
}

export interface CrawlLogsResponse {
  logs: CrawlLogEntry[]
  maxSeq: number
}

async function parseResponse<T>(res: Response): Promise<T> {
  return parseResultResponse<T>(res)
}

export async function fetchCrawlJobs(pageCurrent = 1, pageSize = 20): Promise<CrawlJobPage> {
  const res = await secureFetch(
    `/api/content/crm/crawl/jobs/page?pageCurrent=${pageCurrent}&pageSize=${pageSize}`,
  )
  if (!res.ok) {
    throw new Error(res.status === 403 ? '无管理权限' : '加载爬虫任务失败')
  }
  return parseResponse<CrawlJobPage>(res)
}

export async function createCrawlJob(payload: {
  sourceUrl: string
  configJson?: string
}): Promise<CrawlJob> {
  const res = await secureFetch('/api/content/crm/crawl/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('创建爬虫任务失败')
  }
  return parseResponse<CrawlJob>(res)
}

export async function startCrawlJob(jobId: string): Promise<CrawlJob> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}/start`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('启动任务失败')
  }
  return parseResponse<CrawlJob>(res)
}

export async function pauseCrawlJob(jobId: string): Promise<CrawlJob> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}/pause`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('暂停任务失败')
  }
  return parseResponse<CrawlJob>(res)
}

export async function cancelCrawlJob(jobId: string): Promise<CrawlJob> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}/cancel`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('取消任务失败')
  }
  return parseResponse<CrawlJob>(res)
}

export async function deleteCrawlJob(jobId: string): Promise<void> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('删除任务失败')
  }
  await parseResponse<null>(res)
}

export async function previewCrawl(payload: {
  sourceUrl: string
  configJson?: string
}): Promise<CrawlPreviewResult> {
  const res = await secureFetch('/api/content/crm/crawl/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('预览失败')
  }
  return parseResponse<CrawlPreviewResult>(res)
}

export async function fetchCrawlLogs(jobId: string, afterSeq = 0): Promise<CrawlLogsResponse> {
  const res = await secureFetch(
    `/api/content/crm/crawl/jobs/${encodeURIComponent(jobId)}/logs?afterSeq=${afterSeq}`,
  )
  if (!res.ok) {
    throw new Error('加载日志失败')
  }
  return parseResponse<CrawlLogsResponse>(res)
}

export function buildCrawlConfigJson(goal: string): string {
  return JSON.stringify({ goal: goal.trim() })
}

export function parseCrawlJobGoal(configJson?: string | null): string | null {
  if (!configJson?.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(configJson) as { goal?: string }
    return parsed.goal?.trim() || null
  } catch {
    return null
  }
}
