import { memo } from 'react'
import { ChevronRight, Loader2, Pause, Play, Square, Trash2 } from 'lucide-react'
import type { CrawlJob } from '@/api/crawlAdminApi'
import { parseCrawlJobGoal } from '@/api/crawlAdminApi'
import { Button } from '@/components/ui/button'
import {
  type CrawlJobAction,
  crawlJobActions,
  crawlJobProgressPercent,
  crawlJobStatusClass,
  crawlJobStatusLabel,
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
  const errorPreview = truncateError(job.errorMessage)
  const actions = crawlJobActions(job.status)

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
        'group flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30 lg:flex-row lg:items-center lg:justify-between',
        job.status === 'RUNNING' || job.status === 'PENDING'
          ? 'border-primary/30 bg-primary/[0.03]'
          : 'border-border/80',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{job.title || '解析中…'}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              crawlJobStatusClass(job.status),
            )}
          >
            {crawlJobStatusLabel(job.status)}
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 lg:ml-0">
            日志
            <ChevronRight className="size-3.5" />
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{job.sourceUrl}</p>
        {jobGoal ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">目标：{jobGoal}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            进度 {job.chaptersDone ?? 0}/{job.chaptersTotal ?? '?'}
          </span>
          {job.catalogNovelId ? <span>书库 {job.catalogNovelId.slice(0, 8)}…</span> : null}
          {percent != null ? <span>{percent}%</span> : null}
        </div>
        {percent != null ? (
          <div className="mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : job.status === 'RUNNING' ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-primary">
            <Loader2 className="size-3.5 animate-spin" />
            执行中
          </div>
        ) : null}
        {errorPreview ? (
          <p className="mt-1 line-clamp-1 text-xs text-destructive">{errorPreview}</p>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {actions.map((action) => {
            const meta = ACTION_META[action]
            const Icon = meta.icon
            const busy = actingKey === `${job.id}:${action}`
            return (
              <Button
                key={action}
                size="sm"
                variant={meta.variant ?? 'outline'}
                disabled={actingKey != null && !busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(job, action)
                }}
              >
                {busy ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <Icon className="mr-1 size-3.5" />
                )}
                {meta.label}
              </Button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
})
