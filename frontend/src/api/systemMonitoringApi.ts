import i18n from '@/i18n'
import { secureFetch } from '@/security/secureFetch'
import { parseResultResponse, readApiErrorMessage } from '@/utils/resultApi'

export type ProbeStatus = 'up' | 'degraded' | 'down'

export interface HostMetrics {
  cpuPercent: number | null
  memoryUsedMb: number | null
  memoryTotalMb: number | null
  diskUsedGb: number | null
  diskTotalGb: number | null
  uptimeSeconds: number | null
}

export interface JvmMetrics {
  heapUsedMb: number
  heapMaxMb: number
  threads: number
  uptimeSeconds: number
}

export interface ServiceProbe {
  id: string
  status: ProbeStatus
  latencyMs?: number | null
}

export interface MonitoringSnapshot {
  host: HostMetrics
  services: ServiceProbe[]
  jvm: JvmMetrics
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

export async function fetchMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const res = await secureFetch('/api/worker/crm/monitoring/snapshot')
  const data = await parseResponse<MonitoringSnapshot>(res)
  return {
    host: data.host ?? {
      cpuPercent: null,
      memoryUsedMb: null,
      memoryTotalMb: null,
      diskUsedGb: null,
      diskTotalGb: null,
      uptimeSeconds: null,
    },
    services: Array.isArray(data.services) ? data.services : [],
    jvm: data.jvm ?? { heapUsedMb: 0, heapMaxMb: 0, threads: 0, uptimeSeconds: 0 },
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `${value.toFixed(1)}%`
}

export function formatMb(used: number | null | undefined, total: number | null | undefined): string {
  if (used == null && total == null) {
    return '—'
  }
  if (total != null && used != null) {
    return `${used} / ${total} MB`
  }
  if (used != null) {
    return `${used} MB`
  }
  return `${total} MB`
}

export function formatGb(used: number | null | undefined, total: number | null | undefined): string {
  if (used == null && total == null) {
    return '—'
  }
  if (total != null && used != null) {
    return `${used} / ${total} GB`
  }
  if (used != null) {
    return `${used} GB`
  }
  return `${total} GB`
}

export function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) {
    return '—'
  }
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const mins = Math.floor((seconds % 3_600) / 60)
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function serviceLabelKey(id: string): string {
  return `admin:monitoring.services.${id}`
}
