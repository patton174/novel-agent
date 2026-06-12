import type { CrawlJob, CrawlJobStatus } from '@/api/crawlAdminApi'

export type CrawlJobAction = 'start' | 'pause' | 'cancel' | 'delete'

export const CRAWL_JOB_ACTION_META: Record<
  CrawlJobAction,
  { label: string; variant?: 'outline' | 'destructive' }
> = {
  start: { label: '启动' },
  pause: { label: '暂停' },
  cancel: { label: '取消' },
  delete: { label: '删除', variant: 'destructive' },
}

const STATUS_LABEL: Record<CrawlJobStatus, string> = {
  PENDING: '待启动',
  RUNNING: '运行中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
}

const STATUS_CLASS: Record<CrawlJobStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  RUNNING: 'bg-primary/15 text-primary',
  PAUSED: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  FAILED: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground',
}

export function crawlJobStatusLabel(status: CrawlJobStatus): string {
  return STATUS_LABEL[status] ?? status
}

export function crawlJobStatusClass(status: CrawlJobStatus): string {
  return STATUS_CLASS[status] ?? STATUS_CLASS.PENDING
}

export function crawlJobActions(status: CrawlJobStatus): CrawlJobAction[] {
  switch (status) {
    case 'PENDING':
      return ['start', 'cancel', 'delete']
    case 'RUNNING':
      return ['pause', 'cancel']
    case 'PAUSED':
      return ['start', 'cancel', 'delete']
    case 'FAILED':
      return ['start', 'delete']
    case 'COMPLETED':
    case 'CANCELLED':
      return ['delete']
    default:
      return []
  }
}

export function crawlJobProgressPercent(job: CrawlJob): number | null {
  const total = job.chaptersTotal
  const done = job.chaptersDone ?? 0
  if (total == null || total <= 0) {
    return null
  }
  return Math.min(100, Math.round((done / total) * 100))
}

export function crawlJobOptimisticPatch(
  action: CrawlJobAction,
): Partial<CrawlJob> | null {
  const now = Date.now()
  switch (action) {
    case 'start':
      return { status: 'RUNNING', errorMessage: null }
    case 'pause':
      return { status: 'PAUSED' }
    case 'cancel':
      return { status: 'CANCELLED', completedAt: now }
    default:
      return null
  }
}

export function crawlJobDisplayTitle(job: CrawlJob, goal: string | null): string {
  const title = job.title?.trim()
  if (title && title !== '解析中…' && title.length <= 80) {
    return title
  }
  if (goal?.trim()) {
    const g = goal.trim()
    return g.length <= 72 ? g : `${g.slice(0, 72)}…`
  }
  if (title) {
    return title.length <= 72 ? title : `${title.slice(0, 72)}…`
  }
  return '未命名任务'
}

export function crawlJobProgressLabel(job: CrawlJob): string | null {
  const done = job.chaptersDone ?? 0
  const total = job.chaptersTotal
  if (total != null && total > 0) {
    return `${done}/${total} 章`
  }
  if (job.status === 'COMPLETED') {
    return '已完成'
  }
  if (job.status === 'RUNNING' || job.status === 'PENDING') {
    return '执行中'
  }
  return null
}

export function shortenSourceUrl(url: string, max = 48): string {
  try {
    const u = new URL(url)
    const path = u.pathname + u.search
    const host = u.host
    const combined = `${host}${path}`
    return combined.length <= max ? combined : `${combined.slice(0, max)}…`
  } catch {
    return url.length <= max ? url : `${url.slice(0, max)}…`
  }
}

export function truncateError(message: string | null | undefined, max = 120): string | null {
  if (!message?.trim()) {
    return null
  }
  const text = message.trim()
  return text.length <= max ? text : `${text.slice(0, max)}…`
}
