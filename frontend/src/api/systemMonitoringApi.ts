import { fetchPlatformStats } from './adminApi'
import { fetchWorkerJobsOverview } from './systemJobsApi'

export type ProbeStatus = 'up' | 'degraded' | 'down'

export interface ServiceProbeResult {
  id: string
  label: string
  endpoint: string
  kind: 'frontend' | 'backend'
  status: ProbeStatus
  latencyMs?: number
  detail?: string
}

async function timedFetch(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; latencyMs: number; body?: string }> {
  const started = performance.now()
  try {
    const res = await fetch(url, { ...init, credentials: 'same-origin' })
    const latencyMs = Math.round(performance.now() - started)
    const body = res.ok ? await res.text().catch(() => undefined) : undefined
    return { ok: res.ok, status: res.status, latencyMs, body }
  } catch {
    return { ok: false, status: 0, latencyMs: Math.round(performance.now() - started) }
  }
}

export async function probeServiceHealth(): Promise<ServiceProbeResult[]> {
  const results: ServiceProbeResult[] = []

  results.push({
    id: 'frontend',
    label: 'Frontend',
    endpoint: window.location.origin,
    kind: 'frontend',
    status: 'up',
    detail: navigator.onLine ? 'Browser online' : 'Browser offline',
  })

  const actuator = await timedFetch('/actuator/health')
  results.push({
    id: 'novel-studio-actuator',
    label: 'novel-studio (Actuator)',
    endpoint: '/actuator/health',
    kind: 'backend',
    status: actuator.ok ? 'up' : actuator.status === 503 ? 'degraded' : 'down',
    latencyMs: actuator.latencyMs,
    detail: actuator.ok ? actuator.body?.slice(0, 120) : `HTTP ${actuator.status || 'ERR'}`,
  })

  const adminApiStarted = performance.now()
  try {
    await fetchPlatformStats()
    results.push({
      id: 'novel-studio-admin',
      label: 'novel-studio (Auth CRM)',
      endpoint: '/api/auth/crm/stats/overview',
      kind: 'backend',
      status: 'up',
      latencyMs: Math.round(performance.now() - adminApiStarted),
    })
  } catch (err) {
    results.push({
      id: 'novel-studio-admin',
      label: 'novel-studio (Auth CRM)',
      endpoint: '/api/auth/crm/stats/overview',
      kind: 'backend',
      status: 'down',
      latencyMs: Math.round(performance.now() - adminApiStarted),
      detail: err instanceof Error ? err.message : 'Request failed',
    })
  }

  const jobsApiStarted = performance.now()
  try {
    const jobs = await fetchWorkerJobsOverview()
    results.push({
      id: 'novel-studio-jobs',
      label: 'novel-studio (Jobs API)',
      endpoint: '/api/worker/crm/jobs/overview',
      kind: 'backend',
      status: 'up',
      latencyMs: Math.round(performance.now() - jobsApiStarted),
      detail: `${jobs.scheduled.length} scheduled · ${jobs.mqConsumers.length} mq`,
    })
  } catch (err) {
    results.push({
      id: 'novel-studio-jobs',
      label: 'novel-studio (Jobs API)',
      endpoint: '/api/worker/crm/jobs/overview',
      kind: 'backend',
      status: 'down',
      latencyMs: Math.round(performance.now() - jobsApiStarted),
      detail: err instanceof Error ? err.message : 'Request failed',
    })
  }

  return results
}
