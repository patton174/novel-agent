import { Link } from 'react-router-dom'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, RefreshCw } from 'lucide-react'
import {
  EXTERNAL_OPS_JOBS_CATALOG,
  BATCH_JOB_I18N,
  MQ_CONSUMER_I18N,
  SCHEDULED_JOB_I18N,
  SYSTEM_JOB_KIND_LABEL,
  type SystemJobKind,
} from '@/config/systemJobsCatalog'
import { fetchWorkerJobsOverview, formatJobIntervalMs, type WorkerJobsOverview } from '@/api/systemJobsApi'
import { AdminFoldSection } from '@/components/admin/AdminFoldSection'
import { AdminButtonGhost, AdminButtonOutline } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
  AdminStatStrip,
} from '@/components/layout/AdminDataLayout'
import { PixelBadge } from '@/components/pixel'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'

const KIND_TONE: Record<SystemJobKind, 'default' | 'success' | 'warning' | 'muted'> = {
  cron: 'default',
  daemon: 'success',
  mq: 'warning',
  deploy: 'muted',
}

function JobCard({
  title,
  description,
  badge,
  meta,
  hint,
}: {
  title: string
  description: string
  badge: ReactNode
  meta?: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {badge}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {meta ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta}</p> : null}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** 定时任务注册表（只读）：展示 Cron / MQ / 外部守护进程，不含业务运维操作。 */
export default function SystemJobsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [overview, setOverview] = useState<WorkerJobsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOverview(await fetchWorkerJobsOverview())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin:jobs.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const formatMs = useCallback((ms: number) => formatJobIntervalMs(ms, t), [t])

  const statItems = useMemo(() => {
    if (!overview) {
      return [
        { label: t('admin:jobs.statScheduled'), value: '—' },
        { label: t('admin:jobs.statMq'), value: '—' },
        { label: t('admin:jobs.statScheduling'), value: '—' },
      ]
    }
    return [
      { label: t('admin:jobs.statScheduled'), value: String(overview.scheduled.length) },
      { label: t('admin:jobs.statMq'), value: String(overview.mqConsumers.length) },
      {
        label: t('admin:jobs.statScheduling'),
        value: overview.meta.schedulingEnabled ? t('admin:jobs.schedulingOn') : t('admin:jobs.schedulingOff'),
      },
    ]
  }, [overview, t])

  return (
    <AdminDataPage>
      <AdminStatStrip items={statItems} />

      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:jobs.title')}
          description={t('admin:jobs.descRegistry')}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <AdminButtonOutline onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                {t('admin:jobs.refresh')}
              </AdminButtonOutline>
              <AdminButtonGhost asChild>
                <Link to="/admin/system/monitoring">
                  {t('admin:jobs.openMonitoring')}
                  <ArrowRight className="size-3.5" />
                </Link>
              </AdminButtonGhost>
            </div>
          }
        />
        <AdminDataPanelBody className="space-y-4">
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {overview?.meta ? (
            <p className="text-xs text-muted-foreground">
              {t('admin:jobs.metaScheduling', {
                lock: overview.meta.schedulingLockSeconds,
                enabled: overview.meta.schedulingEnabled
                  ? t('admin:jobs.schedulingOn')
                  : t('admin:jobs.schedulingOff'),
              })}
            </p>
          ) : null}

          <AdminFoldSection
            title={t('admin:jobs.sectionScheduled')}
            description={t('admin:jobs.sectionScheduledDesc')}
            defaultOpen
            badge={<PixelBadge tone="default">{overview?.scheduled.length ?? 0}</PixelBadge>}
          >
            {loading && !overview ? (
              <Skeleton className="h-20 w-full rounded-lg" />
            ) : (
              <div className="space-y-2">
                {overview?.scheduled.map((job) => {
                  const i18n = SCHEDULED_JOB_I18N[job.jobId]
                  return (
                    <JobCard
                      key={`${job.source}:${job.jobId}`}
                      title={i18n ? t(i18n.labelKey) : job.jobId}
                      description={i18n ? t(i18n.descKey) : t('admin:jobs.runtime.genericDesc')}
                      badge={
                        <PixelBadge tone={job.source === 'studio' ? 'success' : 'default'}>
                          {job.source === 'studio' ? t('admin:jobs.sourceStudio') : t('admin:jobs.sourceSpring')}
                        </PixelBadge>
                      }
                      meta={t('admin:jobs.intervalMeta', {
                        initial: formatMs(job.initialDelayMs),
                        interval: formatMs(job.fixedDelayMs),
                      })}
                    />
                  )
                })}
              </div>
            )}
          </AdminFoldSection>

          <AdminFoldSection
            title={t('admin:jobs.sectionMq')}
            description={t('admin:jobs.sectionMqDesc')}
            defaultOpen
            badge={<PixelBadge tone="warning">{overview?.mqConsumers.length ?? 0}</PixelBadge>}
          >
            {loading && !overview ? (
              <Skeleton className="h-20 w-full rounded-lg" />
            ) : (
              <div className="space-y-2">
                {overview?.mqConsumers.map((mq) => {
                  const i18n = MQ_CONSUMER_I18N[mq.id]
                  return (
                    <JobCard
                      key={mq.id}
                      title={i18n ? t(i18n.labelKey) : mq.id}
                      description={i18n ? t(i18n.descKey) : mq.queue}
                      badge={<PixelBadge tone="warning">{t(SYSTEM_JOB_KIND_LABEL.mq)}</PixelBadge>}
                      meta={`${mq.exchange} → ${mq.routingKey} → ${mq.queue}`}
                    />
                  )
                })}
              </div>
            )}
          </AdminFoldSection>

          {overview && overview.batchJobTypes.length > 0 ? (
            <AdminFoldSection
              title={t('admin:jobs.sectionBatchHandlers')}
              description={t('admin:jobs.sectionBatchHandlersDesc')}
              badge={<PixelBadge tone="muted">{overview.batchJobTypes.length}</PixelBadge>}
            >
              <div className="space-y-2">
                {overview.batchJobTypes.map((batch) => {
                  const i18n = BATCH_JOB_I18N[batch.jobType]
                  return (
                    <JobCard
                      key={batch.jobType}
                      title={i18n ? t(i18n.labelKey) : batch.jobType}
                      description={i18n ? t(i18n.descKey) : batch.handler}
                      badge={<PixelBadge tone="muted">{t('admin:jobs.kindBatchHandler')}</PixelBadge>}
                      meta={`jobType: ${batch.jobType}`}
                    />
                  )
                })}
              </div>
            </AdminFoldSection>
          ) : null}

          <AdminFoldSection
            title={t('admin:jobs.sectionExternal')}
            description={t('admin:jobs.sectionExternalDesc')}
            badge={<PixelBadge tone="muted">{EXTERNAL_OPS_JOBS_CATALOG.length}</PixelBadge>}
          >
            <div className="space-y-2">
              {EXTERNAL_OPS_JOBS_CATALOG.map((job) => (
                <JobCard
                  key={job.id}
                  title={t(job.labelKey)}
                  description={t(job.descKey)}
                  badge={<PixelBadge tone={KIND_TONE[job.kind]}>{t(SYSTEM_JOB_KIND_LABEL[job.kind])}</PixelBadge>}
                  meta={job.scheduleKey ? t(job.scheduleKey) : undefined}
                  hint={job.docHintKey ? t(job.docHintKey) : undefined}
                />
              ))}
            </div>
          </AdminFoldSection>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">{t('admin:jobs.registryHint')}</p>
            <AdminButtonGhost asChild>
              <Link to="/admin/content/uploads">{t('admin:jobs.openUploadOps')}</Link>
            </AdminButtonGhost>
          </div>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
