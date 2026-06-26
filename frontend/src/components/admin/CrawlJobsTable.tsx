import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import type { CrawlJob } from '@/api/crawlAdminApi'
import { parseCrawlJobGoal } from '@/api/crawlAdminApi'
import { AdminResponsivePixelTable } from '@/components/admin/AdminResponsivePixelTable'
import { CrawlJobActions } from '@/components/admin/CrawlJobActions'
import {
  PixelBadge,
  PixelCellStack,
  PixelCellText,
  pixelMobileCardClass,
  type PixelColumn,
} from '@/components/pixel'
import {
  crawlJobDisplayTitle,
  crawlJobProgressLabel,
  crawlJobProgressPercent,
  crawlJobStatusLabel,
  crawlJobStatusTone,
  shortenSourceUrl,
  truncateError,
  type CrawlJobAction,
} from '@/pages/admin/crawlJobUi'

export interface CrawlJobsTableProps {
  jobs: CrawlJob[]
  actingKey: string | null
  loading?: boolean
  initialLoading?: boolean
  emptyText: string
  onOpen: (job: CrawlJob) => void
  onAction: (job: CrawlJob, action: CrawlJobAction) => void
}

export function CrawlJobsTable({
  jobs,
  actingKey,
  loading = false,
  initialLoading = false,
  emptyText,
  onOpen,
  onAction,
}: CrawlJobsTableProps) {
  const { t } = useTranslation(['admin'])

  const columns = useMemo((): PixelColumn<CrawlJob>[] => {
    return [
      {
        key: 'task',
        header: t('admin:crawler.colTask'),
        className: 'min-w-[200px]',
        render: (job) => {
          const title = crawlJobDisplayTitle(job, parseCrawlJobGoal(job.configJson))
          const parts = [shortenSourceUrl(job.sourceUrl), crawlJobProgressLabel(job)].filter(Boolean)
          return <PixelCellStack title={title} subtitle={parts.join(' · ') || undefined} />
        },
      },
      {
        key: 'status',
        header: t('admin:crawler.colStatus'),
        render: (job) => (
          <PixelBadge tone={crawlJobStatusTone(job.status)}>{crawlJobStatusLabel(job.status)}</PixelBadge>
        ),
      },
      {
        key: 'progress',
        header: t('admin:crawler.colProgress'),
        className: 'min-w-[100px]',
        render: (job) => {
          const percent = crawlJobProgressPercent(job)
          if (percent != null) {
            return (
              <div className="min-w-[100px]">
                <PixelCellText>{percent}%</PixelCellText>
                <div className="mt-1 h-1.5 border border-foreground/30 bg-muted/30">
                  <div
                    className="h-full bg-primary transition-[width] duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          }
          const isActive = job.status === 'RUNNING' || job.status === 'PENDING'
          if (isActive) {
            return (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                <Loader2 className="size-3 animate-spin" />
                {t('admin:crawler.running')}
              </span>
            )
          }
          return <span className="font-mono text-xs text-muted-foreground">—</span>
        },
      },
      {
        key: 'actions',
        header: t('admin:users.colActions'),
        align: 'right',
        render: (job) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <CrawlJobActions job={job} actingKey={actingKey} onAction={onAction} variant="icon" />
          </div>
        ),
      },
    ]
  }, [actingKey, onAction, t])

  return (
    <AdminResponsivePixelTable
      columns={columns}
      data={jobs}
      rowKey="id"
      loading={loading}
      initialLoading={initialLoading}
      emptyText={emptyText}
      onRowClick={onOpen}
      className="[&_tbody_tr]:cursor-pointer"
      renderMobileCard={(job) => (
        <CrawlJobMobileCard job={job} actingKey={actingKey} onOpen={onOpen} onAction={onAction} t={t} />
      )}
    />
  )
}

function CrawlJobMobileCard({
  job,
  actingKey,
  onOpen,
  onAction,
  t,
}: {
  job: CrawlJob
  actingKey: string | null
  onOpen: (job: CrawlJob) => void
  onAction: (job: CrawlJob, action: CrawlJobAction) => void
  t: (key: string) => string
}) {
  const percent = crawlJobProgressPercent(job)
  const title = crawlJobDisplayTitle(job, parseCrawlJobGoal(job.configJson))
  const progressLabel = crawlJobProgressLabel(job)
  const errorPreview = truncateError(job.errorMessage, 160)
  const isActive = job.status === 'RUNNING' || job.status === 'PENDING'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(job)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(job)
        }
      }}
      className={pixelMobileCardClass(isActive)}
    >
      <div className="flex items-start justify-between gap-2">
        <PixelCellStack
          title={title}
          subtitle={[shortenSourceUrl(job.sourceUrl), progressLabel].filter(Boolean).join(' · ') || undefined}
          className="min-w-0 flex-1"
        />
        <PixelBadge tone={crawlJobStatusTone(job.status)} className="shrink-0">
          {crawlJobStatusLabel(job.status)}
        </PixelBadge>
      </div>
      {percent != null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : isActive ? (
        <p className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-primary">
          <Loader2 className="size-3 animate-spin" />
          {t('admin:crawler.running')}
        </p>
      ) : null}
      {errorPreview ? (
        <p className="mt-2 text-[11px] leading-relaxed text-destructive" title={job.errorMessage ?? undefined}>
          {errorPreview}
        </p>
      ) : null}
      <div className="mt-3 border-t-2 border-foreground/15 pt-2" onClick={(e) => e.stopPropagation()}>
        <CrawlJobActions job={job} actingKey={actingKey} onAction={onAction} variant="compact" />
      </div>
    </article>
  )
}
