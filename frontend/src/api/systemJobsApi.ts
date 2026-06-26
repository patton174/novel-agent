import type { TFunction } from 'i18next'
import { secureFetch } from '@/security/secureFetch'
import { parseResultResponse, readApiErrorMessage } from '@/utils/resultApi'

export interface ScheduledJobItem {
  jobId: string
  source: 'studio' | 'spring' | string
  initialDelayMs: number
  fixedDelayMs: number
}

export interface MqConsumerItem {
  id: string
  queue: string
  exchange: string
  routingKey: string
}

export interface BatchJobTypeItem {
  jobType: string
  handler: string
}

export interface JobsRuntimeMeta {
  schedulingEnabled: boolean
  batchDispatchAvailable: boolean
  schedulingLockSeconds: number
}

export interface WorkerJobsOverview {
  scheduled: ScheduledJobItem[]
  mqConsumers: MqConsumerItem[]
  batchJobTypes: BatchJobTypeItem[]
  meta: JobsRuntimeMeta
}

export interface BatchDispatchPayload {
  jobType: string
  itemIds: string[]
  attributes?: Record<string, string>
}

export interface BatchJobHistoryEntry {
  batchId: string
  jobType: string
  itemCount: number
  phase: 'dispatched' | 'completed' | 'failed' | string
  atEpochMs: number
  detail?: string | null
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('无管理权限')
    }
    throw new Error(await readApiErrorMessage(res))
  }
  return parseResultResponse<T>(res)
}

export async function fetchWorkerJobsOverview(): Promise<WorkerJobsOverview> {
  const res = await secureFetch('/api/worker/crm/jobs/overview')
  const data = await parseResponse<WorkerJobsOverview>(res)
  return {
    scheduled: Array.isArray(data.scheduled) ? data.scheduled : [],
    mqConsumers: Array.isArray(data.mqConsumers) ? data.mqConsumers : [],
    batchJobTypes: Array.isArray(data.batchJobTypes) ? data.batchJobTypes : [],
    meta: data.meta ?? {
      schedulingEnabled: true,
      batchDispatchAvailable: false,
      schedulingLockSeconds: 300,
    },
  }
}

export async function dispatchBatchJob(payload: BatchDispatchPayload): Promise<void> {
  const res = await secureFetch('/api/worker/crm/jobs/batch-dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await parseResponse<void>(res)
}

export async function fetchBatchJobHistory(limit = 20): Promise<BatchJobHistoryEntry[]> {
  const res = await secureFetch(`/api/worker/crm/jobs/history?limit=${limit}`)
  const list = await parseResponse<BatchJobHistoryEntry[]>(res)
  return Array.isArray(list) ? list : []
}

/** 解析 textarea：每行一个 ID，或用逗号/分号分隔。 */
export function parseBatchItemIds(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatJobIntervalMs(ms: number, t: TFunction<'admin'>): string {
  if (ms <= 0) {
    return t('admin:jobs.duration.dash')
  }
  if (ms % 60_000 === 0) {
    const mins = ms / 60_000
    return mins === 1 ? t('admin:jobs.duration.minute') : t('admin:jobs.duration.minutes', { count: mins })
  }
  if (ms % 1_000 === 0) {
    const secs = ms / 1_000
    return secs === 1 ? t('admin:jobs.duration.second') : t('admin:jobs.duration.seconds', { count: secs })
  }
  return t('admin:jobs.duration.ms', { count: ms })
}
