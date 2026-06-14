import { useTranslation } from 'react-i18next'
import { Loader2, Pause, Play, Square, Trash2 } from 'lucide-react'
import type { CrawlJob } from '@/api/crawlAdminApi'
import { parseCrawlJobGoal } from '@/api/crawlAdminApi'
import { CrawlLogTerminal } from '@/components/admin/CrawlLogTerminal'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import {
  CRAWL_JOB_ACTION_META,
  type CrawlJobAction,
  crawlJobActions,
  crawlJobProgressPercent,
  crawlJobStatusClass,
  crawlJobStatusLabel,
  truncateError,
} from '@/pages/admin/crawlJobUi'
import { cn } from '@/lib/utils'

const ACTION_ICONS: Record<CrawlJobAction, typeof Play> = {
  start: Play,
  pause: Pause,
  cancel: Square,
  delete: Trash2,
}

interface CrawlJobDetailModalProps {
  job: CrawlJob | null
  open: boolean
  actingKey: string | null
  pollPaused?: boolean
  onOpenChange: (open: boolean) => void
  onAction: (job: CrawlJob, action: CrawlJobAction) => void
}

export function CrawlJobDetailModal({
  job,
  open,
  actingKey,
  pollPaused = false,
  onOpenChange,
  onAction,
}: CrawlJobDetailModalProps) {
  const { t } = useTranslation(['admin'])

  if (!job) {
    return null
  }

  const goal = parseCrawlJobGoal(job.configJson)
  const percent = crawlJobProgressPercent(job)
  const errorPreview = truncateError(job.errorMessage, 2000)
  const actions = crawlJobActions(job.status)

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      size="detail"
      className="gap-0 overflow-hidden p-0 sm:max-w-3xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      header={
        <div className="space-y-3 border-b border-border px-6 py-4 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <h2 className="text-lg font-semibold">{job.title || t('admin:crawler.parsing')}</h2>
            <span
              className={cn(
                'rounded-lg px-2 py-0.5 text-xs font-medium',
                crawlJobStatusClass(job.status),
              )}
            >
              {crawlJobStatusLabel(job.status)}
            </span>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="break-all text-foreground/80">{job.sourceUrl}</p>
            {goal ? <p>{t('admin:crawler.goalLabel')}：{goal}</p> : null}
            <p>
              {t('admin:crawler.progress')} {job.chaptersDone ?? 0}/{job.chaptersTotal ?? '?'}
              {job.catalogNovelId ? t('admin:crawler.catalogId', { id: job.catalogNovelId }) : ''}
            </p>
            {percent != null ? (
              <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : job.status === 'RUNNING' ? (
              <p className="flex items-center gap-2 text-primary">
                <Loader2 className="size-3.5 animate-spin" />
                {t('admin:crawler.aiRunning')}
              </p>
            ) : null}
            {errorPreview ? <p className="break-all text-destructive">{errorPreview}</p> : null}
          </div>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
        <CrawlLogTerminal
          jobId={job.id}
          jobStatus={job.status}
          variant="modal"
          active={open}
          paused={pollPaused}
        />
      </div>

      {actions.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-3">
          {actions.map((action) => {
            const meta = CRAWL_JOB_ACTION_META[action]
            const Icon = ACTION_ICONS[action]
            const busy = actingKey === `${job.id}:${action}`
            const isDestructive = meta.variant === 'destructive'
            return (
              <Button
                key={action}
                type="button"
                size="sm"
                variant={isDestructive ? 'destructive' : action === 'cancel' ? 'outline' : 'default'}
                disabled={actingKey != null && !busy}
                onClick={() => onAction(job, action)}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Icon className="mr-1.5 size-3.5" />
                )}
                {meta.label()}
              </Button>
            )
          })}
        </div>
      ) : null}
    </AppModalShell>
  )
}
