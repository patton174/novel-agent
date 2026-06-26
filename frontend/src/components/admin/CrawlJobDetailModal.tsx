import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CrawlJob } from '@/api/crawlAdminApi'
import { parseCrawlJobGoal } from '@/api/crawlAdminApi'
import { CrawlJobActions } from '@/components/admin/CrawlJobActions'
import { CrawlLogTerminal } from '@/components/admin/CrawlLogTerminal'
import { PixelBadge } from '@/components/pixel'
import { AppModalShell } from '@/components/ui/AppModalShell'
import {
  crawlJobProgressPercent,
  crawlJobStatusLabel,
  crawlJobStatusTone,
  truncateError,
  type CrawlJobAction,
} from '@/pages/admin/crawlJobUi'

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
            <PixelBadge tone={crawlJobStatusTone(job.status)}>{crawlJobStatusLabel(job.status)}</PixelBadge>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="break-all text-foreground/80">{job.sourceUrl}</p>
            {goal ? <p>{t('admin:crawler.goalLabel')}：{goal}</p> : null}
            <p>
              {t('admin:crawler.progress')} {job.chaptersDone ?? 0}/{job.chaptersTotal ?? '?'}
              {job.catalogNovelId ? t('admin:crawler.catalogId', { id: job.catalogNovelId }) : ''}
            </p>
            {percent != null ? (
              <div className="h-1.5 w-full max-w-md overflow-hidden border border-foreground/30 bg-muted/30">
                <div
                  className="h-full bg-primary transition-all duration-500"
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

      <div className="shrink-0 border-t-2 border-foreground/15 px-6 py-3">
        <CrawlJobActions
          job={job}
          actingKey={actingKey}
          onAction={onAction}
          variant="labeled"
          align="end"
        />
      </div>
    </AppModalShell>
  )
}
