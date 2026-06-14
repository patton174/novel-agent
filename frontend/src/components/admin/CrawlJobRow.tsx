import { useTranslation } from 'react-i18next'
import { memo } from 'react'
import { Loader2, MoreHorizontal, Pause, Play, Square, Trash2 } from 'lucide-react'
import type { CrawlJob } from '@/api/crawlAdminApi'
import { parseCrawlJobGoal } from '@/api/crawlAdminApi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CRAWL_JOB_ACTION_META,
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

const ACTION_ICONS: Record<CrawlJobAction, typeof Play> = {
  start: Play,
  pause: Pause,
  cancel: Square,
  delete: Trash2,
}

function pickPrimaryAction(actions: CrawlJobAction[]): CrawlJobAction | undefined {
  return actions.find((a) => a === 'start' || a === 'pause') ?? actions[0]
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
  const { t } = useTranslation(['admin'])
  const percent = crawlJobProgressPercent(job)
  const jobGoal = parseCrawlJobGoal(job.configJson)
  const title = crawlJobDisplayTitle(job, jobGoal)
  const progressLabel = crawlJobProgressLabel(job)
  const errorPreview = truncateError(job.errorMessage, 160)
  const actions = crawlJobActions(job.status)
  const isActive = job.status === 'RUNNING' || job.status === 'PENDING'
  const primaryAction = pickPrimaryAction(actions)
  const menuActions = primaryAction ? actions.filter((a) => a !== primaryAction) : actions

  const renderActionButton = (action: CrawlJobAction, size: 'icon' | 'sm' = 'icon') => {
    const meta = CRAWL_JOB_ACTION_META[action]
    const Icon = ACTION_ICONS[action]
    const busy = actingKey === `${job.id}:${action}`
    const isDestructive = meta.variant === 'destructive'
    return (
      <Button
        key={action}
        size={size === 'sm' ? 'sm' : 'icon'}
        variant={isDestructive ? 'destructive' : size === 'sm' ? 'default' : 'ghost'}
        className={size === 'icon' ? 'size-8' : 'h-8 gap-1 px-2.5 text-xs'}
        title={meta.label()}
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
        {size === 'sm' ? meta.label() : null}
      </Button>
    )
  }

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
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 flex-1 text-sm font-medium leading-snug sm:truncate">{title}</span>
          <span
            className={cn(
              'shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium',
              crawlJobStatusClass(job.status),
            )}
          >
            {crawlJobStatusLabel(job.status)}
          </span>
        </div>
        <p className="break-all text-xs leading-relaxed text-muted-foreground sm:truncate">
          {shortenSourceUrl(job.sourceUrl)}
          {progressLabel ? ` · ${progressLabel}` : ''}
        </p>
        {percent != null ? (
          <div className="h-1 max-w-full overflow-hidden rounded-full bg-muted sm:max-w-[200px]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : isActive ? (
          <div className="flex items-center gap-1.5 text-[11px] text-primary">
            <Loader2 className="size-3 animate-spin" />
            {t('admin:crawler.running')}
          </div>
        ) : null}
        {errorPreview ? (
          <p
            className="text-[11px] leading-relaxed text-destructive sm:line-clamp-2"
            title={job.errorMessage ?? undefined}
          >
            {errorPreview}
          </p>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <>
          <div className="flex w-full shrink-0 items-center justify-end gap-1 border-t border-border/50 pt-2 sm:hidden">
            {primaryAction ? renderActionButton(primaryAction, 'sm') : null}
            {menuActions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">{t('admin:crawler.moreActions')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {menuActions.map((action) => {
                    const meta = CRAWL_JOB_ACTION_META[action]
                    const Icon = ACTION_ICONS[action]
                    return (
                      <DropdownMenuItem
                        key={action}
                        variant={meta.variant === 'destructive' ? 'destructive' : 'default'}
                        disabled={actingKey != null}
                        onClick={() => onAction(job, action)}
                      >
                        <Icon className="size-3.5" />
                        {meta.label()}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <div className="hidden shrink-0 items-center justify-end gap-1 sm:flex">
            {actions.map((action) => renderActionButton(action))}
          </div>
        </>
      ) : null}
    </div>
  )
})
