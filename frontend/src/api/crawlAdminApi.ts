import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'

export type CrawlJobStatus =
  | 'PENDING'
  | 'QUEUED'
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
  priority?: number
  maxRetries?: number
  retryCount?: number
  scheduleCron?: string | null
  nextRunAt?: number | null
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
    throw new Error(
      res.status === 403
        ? i18n.t('admin:errors.noAdminPermission')
        : i18n.t('admin:errors.loadCrawlJobsFail'),
    )
  }
  return parseResponse<CrawlJobPage>(res)
}

export async function createCrawlJob(payload: {
  sourceUrl: string
  configJson?: string
  priority?: number
  maxRetries?: number
  scheduleCron?: string
}): Promise<CrawlJob> {
  const res = await secureFetch('/api/content/crm/crawl/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(i18n.t('admin:errors.createCrawlJobFail'))
  }
  return parseResponse<CrawlJob>(res)
}

export async function startCrawlJob(jobId: string): Promise<CrawlJob> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}/start`, { method: 'POST' })
  if (!res.ok) {
    throw new Error(i18n.t('admin:errors.startCrawlJobFail'))
  }
  return parseResponse<CrawlJob>(res)
}

export async function pauseCrawlJob(jobId: string): Promise<CrawlJob> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}/pause`, { method: 'POST' })
  if (!res.ok) {
    throw new Error(i18n.t('admin:errors.pauseCrawlJobFail'))
  }
  return parseResponse<CrawlJob>(res)
}

export async function cancelCrawlJob(jobId: string): Promise<CrawlJob> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}/cancel`, { method: 'POST' })
  if (!res.ok) {
    throw new Error(i18n.t('admin:errors.cancelCrawlJobFail'))
  }
  return parseResponse<CrawlJob>(res)
}

export async function deleteCrawlJob(jobId: string): Promise<void> {
  const res = await secureFetch(`/api/content/crm/crawl/jobs/${jobId}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(i18n.t('admin:errors.deleteCrawlJobFail'))
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
    throw new Error(i18n.t('admin:errors.previewFail'))
  }
  return parseResponse<CrawlPreviewResult>(res)
}

export async function fetchCrawlLogs(jobId: string, afterSeq = 0): Promise<CrawlLogsResponse> {
  const res = await secureFetch(
    `/api/content/crm/crawl/jobs/${encodeURIComponent(jobId)}/logs?afterSeq=${afterSeq}`,
  )
  if (!res.ok) {
    throw new Error(i18n.t('admin:errors.loadLogsFail'))
  }
  return parseResponse<CrawlLogsResponse>(res)
}

export function buildCrawlConfigJson(goal: string): string {
  return JSON.stringify({ goal: goal.trim(), maxChapters: 0 })
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
