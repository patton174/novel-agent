import { memo } from 'react'
import { Loader2, Pause, Play, Square, Trash2 } from 'lucide-react'
import type { CrawlJob } from '@/api/crawlAdminApi'
import { parseCrawlJobGoal } from '@/api/crawlAdminApi'
import { Button } from '@/components/ui/button'
import {
  type CrawlJobAction,
  crawlJobActions,
  crawlJobDisplayTitle,
  crawlJobProgressLabel,
  crawlJobProgressPercent,
  crawlJobStatusClass,
  crawlJobStatusLabel,
  shortenSourceUrl,
  truncateError,
} from '@/pages/admin/crawlJobUi'
import { cn } from '@/lib/utils'

const ACTION_META: Record<
  CrawlJobAction,
  { label: string; icon: typeof Play; variant?: 'outline' | 'destructive' }
> = {
  start: { label: '启动', icon: Play },
  pause: { label: '暂停', icon: Pause },
  cancel: { label: '取消', icon: Square },
  delete: { label: '删除', icon: Trash2, variant: 'destructive' },
}

export interface CrawlJobRowProps {
  job: CrawlJob
  actingKey: string | null
  onOpen: (job: CrawlJob) => void
  onAction: (job: CrawlJob, action: CrawlJobAction) => void
}

export const CrawlJobRow = memo(function CrawlJobRow({
  job,
  actingKey,
  onOpen,
  onAction,
}: CrawlJobRowProps) {
  const percent = crawlJobProgressPercent(job)
  const jobGoal = parseCrawlJobGoal(job.configJson)
  const title = crawlJobDisplayTitle(job, jobGoal)
  const progressLabel = crawlJobProgressLabel(job)
  const errorPreview = truncateError(job.errorMessage, 160)
  const actions = crawlJobActions(job.status)
  const isActive = job.status === 'RUNNING' || job.status === 'PENDING'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(job)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(job)
        }
      }}
      className={cn(
        'group flex cursor-pointer flex-col gap-2 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3',
        isActive ? 'border-primary/25 bg-primary/[0.03]' : 'border-border/70',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              crawlJobStatusClass(job.status),
            )}
          >
            {crawlJobStatusLabel(job.status)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {shortenSourceUrl(job.sourceUrl)}
          {progressLabel ? ` · ${progressLabel}` : ''}
        </p>
        {percent != null ? (
          <div className="h-1 max-w-[200px] overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : isActive ? (
          <div className="flex items-center gap-1.5 text-[11px] text-primary">
            <Loader2 className="size-3 animate-spin" />
            运行中
          </div>
        ) : null}
        {errorPreview ? (
          <p className="line-clamp-2 text-[11px] leading-snug text-destructive" title={job.errorMessage ?? undefined}>
            {errorPreview}
          </p>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
          {actions.map((action) => {
            const meta = ACTION_META[action]
            const Icon = meta.icon
            const busy = actingKey === `${job.id}:${action}`
            return (
              <Button
                key={action}
                size="icon"
                variant={meta.variant === 'destructive' ? 'destructive' : 'ghost'}
                className="size-8"
                title={meta.label}
                disabled={actingKey != null && !busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(job, action)
                }}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Icon className="size-3.5" />
                )}
              </Button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
})
