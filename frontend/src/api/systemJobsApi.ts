import type { TFunction } from 'i18next'
import i18n from '@/i18n'
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

export type JobScheduleType = 'fixed_delay' | 'cron'

export interface ScheduledJobConfig {
  jobId: string
  enabled: boolean
  scheduleType: JobScheduleType
  fixedDelayMs: number
  cronExpression: string | null
  initialDelayMs: number
  updatedBy?: string | null
  updatedAt?: string | null
}

export interface UpdateJobConfigPayload {
  enabled: boolean
  scheduleType: JobScheduleType
  fixedDelayMs: number
  cronExpression: string | null
  initialDelayMs: number
}

export interface ManualJobRunResponse {
  runId: number | string
}

export interface ScheduledJobRun {
  id: number
  jobId: string
  triggerType: 'scheduled' | 'manual' | string
  status: 'running' | 'success' | 'failed' | string
  startedAt: string
  finishedAt?: string | null
  errorMessage?: string | null
  instanceId?: string | null
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(i18n.t('admin:errors.noAdminPermission'))
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

function normalizeJobConfig(raw: ScheduledJobConfig): ScheduledJobConfig {
  const scheduleType: JobScheduleType =
    raw.scheduleType === 'cron' ? 'cron' : 'fixed_delay'
  return {
    jobId: raw.jobId,
    enabled: Boolean(raw.enabled),
    scheduleType,
    fixedDelayMs: Number(raw.fixedDelayMs) || 0,
    cronExpression: raw.cronExpression ?? null,
    initialDelayMs: Number(raw.initialDelayMs) || 0,
    updatedBy: raw.updatedBy ?? null,
    updatedAt: raw.updatedAt ?? null,
  }
}

export async function getJobConfig(jobId: string): Promise<ScheduledJobConfig> {
  const res = await secureFetch(`/api/worker/crm/jobs/${encodeURIComponent(jobId)}/config`)
  return normalizeJobConfig(await parseResponse<ScheduledJobConfig>(res))
}

export async function updateJobConfig(
  jobId: string,
  payload: UpdateJobConfigPayload,
): Promise<ScheduledJobConfig> {
  const res = await secureFetch(`/api/worker/crm/jobs/${encodeURIComponent(jobId)}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return normalizeJobConfig(await parseResponse<ScheduledJobConfig>(res))
}

export async function reloadJobs(): Promise<void> {
  const res = await secureFetch('/api/worker/crm/jobs/reload', {
    method: 'POST',
  })
  await parseResponse<void>(res)
}

export async function runJob(jobId: string): Promise<ManualJobRunResponse> {
  const res = await secureFetch(`/api/worker/crm/jobs/${encodeURIComponent(jobId)}/run`, {
    method: 'POST',
  })
  return parseResponse<ManualJobRunResponse>(res)
}

export async function getJobRuns(jobId: string, limit = 20): Promise<ScheduledJobRun[]> {
  const res = await secureFetch(
    `/api/worker/crm/jobs/${encodeURIComponent(jobId)}/runs?limit=${limit}`,
  )
  const list = await parseResponse<ScheduledJobRun[]>(res)
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
