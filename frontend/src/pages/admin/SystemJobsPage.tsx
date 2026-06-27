import { Link } from 'react-router-dom'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, History, Play, RefreshCw, Settings2 } from 'lucide-react'
import {
  EXTERNAL_OPS_JOBS_CATALOG,
  BATCH_JOB_I18N,
  MQ_CONSUMER_I18N,
  SCHEDULED_JOB_I18N,
  SYSTEM_JOB_KIND_LABEL,
  type SystemJobKind,
} from '@/config/systemJobsCatalog'
import {
  fetchWorkerJobsOverview,
  formatJobIntervalMs,
  getJobConfig,
  getJobRuns,
  reloadJobs,
  runJob,
  updateJobConfig,
  type JobScheduleType,
  type ScheduledJobConfig,
  type ScheduledJobItem,
  type ScheduledJobRun,
  type UpdateJobConfigPayload,
  type WorkerJobsOverview,
} from '@/api/systemJobsApi'
import { AdminFoldSection } from '@/components/admin/AdminFoldSection'
import {
  AdminButton,
  AdminButtonGhost,
  AdminButtonOutline,
  AdminField,
  AdminSelect,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
  AdminStatStrip,
} from '@/components/layout/AdminDataLayout'
import { PixelBadge } from '@/components/pixel'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const KIND_TONE: Record<SystemJobKind, 'default' | 'success' | 'warning' | 'muted'> = {
  cron: 'default',
  daemon: 'success',
  mq: 'warning',
  deploy: 'muted',
}

const RUN_STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  running: 'default',
  success: 'success',
  failed: 'warning',
}

function formatRunTime(iso: string | null | undefined, locale: string): string {
  if (!iso) {
    return '—'
  }
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(locale)
}

function resolveScheduledJobLabel(jobId: string, t: (key: string) => string): string {
  const i18n = SCHEDULED_JOB_I18N[jobId]
  return i18n ? t(i18n.labelKey) : jobId
}

function JobCard({
  title,
  description,
  badge,
  meta,
  hint,
  actions,
}: {
  title: string
  description: string
  badge: ReactNode
  meta?: string
  hint?: string
  actions?: ReactNode
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
      {actions ? <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

function ScheduledJobRunRow({ run, locale }: { run: ScheduledJobRun; locale: string }) {
  const { t } = useTranslation(['admin'])
  const statusKey = `admin:jobs.manualRun.status.${run.status}` as const
  const triggerKey = `admin:jobs.manualRun.trigger.${run.triggerType}` as const
  const statusLabel = t(statusKey, { defaultValue: run.status })
  const triggerLabel = t(triggerKey, { defaultValue: run.triggerType })
  const tone = RUN_STATUS_TONE[run.status] ?? 'muted'

  return (
    <div className="rounded-lg border border-border/70 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PixelBadge tone={tone}>{statusLabel}</PixelBadge>
          <PixelBadge tone="muted">{triggerLabel}</PixelBadge>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">#{run.id}</span>
      </div>
      <dl className="mt-2 grid gap-1 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t('admin:jobs.manualRun.colStarted')}</dt>
          <dd>{formatRunTime(run.startedAt, locale)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('admin:jobs.manualRun.colFinished')}</dt>
          <dd>{formatRunTime(run.finishedAt, locale)}</dd>
        </div>
        {run.instanceId ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t('admin:jobs.manualRun.colInstance')}</dt>
            <dd className="break-all font-mono text-[10px]">{run.instanceId}</dd>
          </div>
        ) : null}
        {run.errorMessage ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t('admin:jobs.manualRun.colError')}</dt>
            <dd className="text-destructive">{run.errorMessage}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

type UpdateJobConfigForm = {
  enabled: boolean
  scheduleType: JobScheduleType
  fixedDelayMs: number
  cronExpression: string
  initialDelayMs: number
}

function emptyConfigForm(): UpdateJobConfigForm {
  return {
    enabled: true,
    scheduleType: 'fixed_delay',
    fixedDelayMs: 0,
    cronExpression: '',
    initialDelayMs: 0,
  }
}

function configToForm(config: ScheduledJobConfig): UpdateJobConfigForm {
  return {
    enabled: config.enabled,
    scheduleType: config.scheduleType,
    fixedDelayMs: config.fixedDelayMs,
    cronExpression: config.cronExpression ?? '',
    initialDelayMs: config.initialDelayMs,
  }
}

function formToPayload(form: UpdateJobConfigForm): UpdateJobConfigPayload {
  return {
    enabled: form.enabled,
    scheduleType: form.scheduleType,
    fixedDelayMs: form.fixedDelayMs,
    cronExpression: form.scheduleType === 'cron' ? form.cronExpression.trim() || null : null,
    initialDelayMs: form.initialDelayMs,
  }
}

function JobConfigDialog({
  jobId,
  open,
  onOpenChange,
  onSaved,
}: {
  jobId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (config: ScheduledJobConfig) => void
}) {
  const { t } = useTranslation(['admin'])
  const [form, setForm] = useState<UpdateJobConfigForm>(emptyConfigForm())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !jobId) {
      return
    }
    let cancelled = false
    setLoading(true)
    void getJobConfig(jobId)
      .then((config) => {
        if (!cancelled) {
          setForm(configToForm(config))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          appToast.error(err instanceof Error ? err.message : t('admin:jobs.config.loadFail'))
          onOpenChange(false)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, jobId, onOpenChange, t])

  const handleSave = async () => {
    if (!jobId) {
      return
    }
    setSaving(true)
    try {
      const updated = await updateJobConfig(jobId, formToPayload(form))
      appToast.success(t('admin:jobs.config.saveSuccess'))
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:jobs.config.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      size="form"
      title={t('admin:jobs.config.dialogTitle')}
      description={t('admin:jobs.config.dialogDesc')}
    >
      {loading ? (
        <div className="space-y-3 py-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <AdminField label={t('admin:jobs.config.scheduleType')} layout="form">
            <AdminSelect
              value={form.scheduleType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  scheduleType: e.target.value === 'cron' ? 'cron' : 'fixed_delay',
                }))
              }
            >
              <option value="fixed_delay">{t('admin:jobs.config.scheduleTypeFixedDelay')}</option>
              <option value="cron">{t('admin:jobs.config.scheduleTypeCron')}</option>
            </AdminSelect>
          </AdminField>
          {form.scheduleType === 'cron' ? (
            <AdminField
              label={t('admin:jobs.config.cronExpression')}
              hint={t('admin:jobs.config.cronHint')}
              layout="form"
            >
              <AdminTextInput
                value={form.cronExpression}
                onChange={(e) => setForm((prev) => ({ ...prev, cronExpression: e.target.value }))}
                placeholder="0 */5 * * * *"
              />
            </AdminField>
          ) : (
            <AdminField label={t('admin:jobs.config.fixedDelayMs')} layout="form">
              <AdminTextInput
                type="number"
                min={0}
                value={String(form.fixedDelayMs)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fixedDelayMs: Number(e.target.value) || 0 }))
                }
              />
            </AdminField>
          )}
          <AdminField label={t('admin:jobs.config.initialDelayMs')} layout="form">
            <AdminTextInput
              type="number"
              min={0}
              value={String(form.initialDelayMs)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, initialDelayMs: Number(e.target.value) || 0 }))
              }
            />
          </AdminField>
        </div>
      )}
      <DialogFooter>
        <AdminButtonOutline onClick={() => onOpenChange(false)} disabled={saving}>
          {t('admin:jobs.config.cancel')}
        </AdminButtonOutline>
        <AdminButton onClick={() => void handleSave()} disabled={loading || saving}>
          {saving ? t('admin:jobs.config.saving') : t('admin:jobs.config.save')}
        </AdminButton>
      </DialogFooter>
    </AppModalShell>
  )
}

function ScheduledStudioJobCard({
  job,
  config,
  formatMs,
  schedulingEnabled,
  runningJobId,
  onConfigChange,
  onRefreshOverview,
  onRun,
  onHistory,
}: {
  job: ScheduledJobItem
  config: ScheduledJobConfig | undefined
  formatMs: (ms: number) => string
  schedulingEnabled: boolean
  runningJobId: string | null
  onConfigChange: (config: ScheduledJobConfig) => void
  onRefreshOverview: () => Promise<void>
  onRun: (jobId: string) => void
  onHistory: (jobId: string) => void
}) {
  const { t } = useTranslation(['admin'])
  const i18nEntry = SCHEDULED_JOB_I18N[job.jobId]
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [reloading, setReloading] = useState(false)
  const isRunning = runningJobId === job.jobId

  const scheduleMeta =
    config?.scheduleType === 'cron' && config.cronExpression
      ? t('admin:jobs.config.cronMeta', { cron: config.cronExpression })
      : t('admin:jobs.intervalMeta', {
          initial: formatMs(config?.initialDelayMs ?? job.initialDelayMs),
          interval: formatMs(config?.fixedDelayMs ?? job.fixedDelayMs),
        })

  const handleToggle = async (enabled: boolean) => {
    setToggling(true)
    try {
      const current = config ?? await getJobConfig(job.jobId)
      const updated = await updateJobConfig(job.jobId, {
        enabled,
        scheduleType: current.scheduleType,
        fixedDelayMs: current.fixedDelayMs,
        cronExpression: current.cronExpression,
        initialDelayMs: current.initialDelayMs,
      })
      onConfigChange(updated)
      await onRefreshOverview()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:jobs.config.toggleFail'))
    } finally {
      setToggling(false)
    }
  }

  const handleReload = async () => {
    setReloading(true)
    try {
      await reloadJobs()
      appToast.success(t('admin:jobs.config.reloadSuccess'))
      await onRefreshOverview()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:jobs.config.reloadFail'))
    } finally {
      setReloading(false)
    }
  }

  return (
    <>
      <JobCard
        title={i18nEntry ? t(i18nEntry.labelKey) : job.jobId}
        description={i18nEntry ? t(i18nEntry.descKey) : t('admin:jobs.runtime.genericDesc')}
        badge={
          <>
            <PixelBadge tone="success">{t('admin:jobs.sourceStudio')}</PixelBadge>
            {config ? (
              <PixelBadge tone={config.enabled ? 'success' : 'muted'}>
                {config.enabled ? t('admin:jobs.config.enabled') : t('admin:jobs.config.disabled')}
              </PixelBadge>
            ) : null}
          </>
        }
        meta={scheduleMeta}
        actions={
          <>
            <Switch
              checked={config?.enabled ?? true}
              disabled={toggling}
              onCheckedChange={(checked) => void handleToggle(checked)}
              aria-label={t('admin:jobs.config.enabled')}
            />
            <AdminButtonOutline size="sm" onClick={() => setDialogOpen(true)}>
              <Settings2 className="size-3.5" />
              {t('admin:jobs.config.editSchedule')}
            </AdminButtonOutline>
            <AdminButtonOutline size="sm" onClick={() => void handleReload()} disabled={reloading}>
              <RefreshCw className={`size-3.5 ${reloading ? 'animate-spin' : ''}`} />
              {reloading ? t('admin:jobs.config.reloading') : t('admin:jobs.config.reload')}
            </AdminButtonOutline>
            <AdminButton
              size="sm"
              disabled={isRunning || !schedulingEnabled}
              onClick={() => onRun(job.jobId)}
            >
              <Play className="size-3.5" />
              {isRunning ? t('admin:jobs.manualRun.running') : t('admin:jobs.manualRun.run')}
            </AdminButton>
            <AdminButtonOutline size="sm" onClick={() => onHistory(job.jobId)}>
              <History className="size-3.5" />
              {t('admin:jobs.manualRun.history')}
            </AdminButtonOutline>
          </>
        }
      />
      <JobConfigDialog
        jobId={job.jobId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={(updated) => {
          onConfigChange(updated)
          void onRefreshOverview()
        }}
      />
    </>
  )
}

/** 定时任务注册表：展示 Cron / MQ / 外部守护进程；平台调度任务支持配置、手动 Run 与运行历史。 */
export default function SystemJobsPage() {
  const { t, i18n } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [overview, setOverview] = useState<WorkerJobsOverview | null>(null)
  const [jobConfigs, setJobConfigs] = useState<Record<string, ScheduledJobConfig>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const [historyJob, setHistoryJob] = useState<{ jobId: string; title: string } | null>(null)
  const [historyRuns, setHistoryRuns] = useState<ScheduledJobRun[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

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

  const loadStudioJobConfigs = useCallback(async (scheduled: ScheduledJobItem[]) => {
    const studioJobs = scheduled.filter((job) => job.source === 'studio')
    if (studioJobs.length === 0) {
      return
    }
    const entries = await Promise.all(
      studioJobs.map(async (job) => {
        try {
          const config = await getJobConfig(job.jobId)
          return [job.jobId, config] as const
        } catch {
          return null
        }
      }),
    )
    const next: Record<string, ScheduledJobConfig> = {}
    for (const entry of entries) {
      if (entry) {
        next[entry[0]] = entry[1]
      }
    }
    if (Object.keys(next).length > 0) {
      setJobConfigs((prev) => ({ ...prev, ...next }))
    }
  }, [])

  useEffect(() => {
    if (!overview?.scheduled.length) {
      return
    }
    void loadStudioJobConfigs(overview.scheduled)
  }, [overview, loadStudioJobConfigs])

  const handleConfigChange = useCallback((config: ScheduledJobConfig) => {
    setJobConfigs((prev) => ({ ...prev, [config.jobId]: config }))
  }, [])

  const loadHistory = useCallback(
    async (jobId: string) => {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        setHistoryRuns(await getJobRuns(jobId, 20))
      } catch (err) {
        setHistoryRuns([])
        setHistoryError(err instanceof Error ? err.message : t('admin:jobs.manualRun.loadHistoryFail'))
      } finally {
        setHistoryLoading(false)
      }
    },
    [t],
  )

  const openHistory = useCallback(
    (jobId: string) => {
      const title = resolveScheduledJobLabel(jobId, t)
      setHistoryJob({ jobId, title })
      void loadHistory(jobId)
    },
    [loadHistory, t],
  )

  const handleRun = useCallback(
    async (jobId: string) => {
      setRunningJobId(jobId)
      try {
        const result = await runJob(jobId)
        appToast.success(t('admin:jobs.manualRun.success', { runId: result.runId }))
        if (historyJob?.jobId === jobId) {
          void loadHistory(jobId)
        }
      } catch (err) {
        appToast.error(err instanceof Error ? err.message : t('admin:jobs.manualRun.fail'))
      } finally {
        setRunningJobId(null)
      }
    },
    [historyJob?.jobId, loadHistory, t],
  )

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

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US'

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
                <p className="text-xs text-muted-foreground">{t('admin:jobs.config.studioOnly')}</p>
                {overview?.scheduled.map((job) => {
                  if (job.source === 'studio') {
                    return (
                      <ScheduledStudioJobCard
                        key={`${job.source}:${job.jobId}`}
                        job={job}
                        config={jobConfigs[job.jobId]}
                        formatMs={formatMs}
                        schedulingEnabled={overview.meta.schedulingEnabled}
                        runningJobId={runningJobId}
                        onConfigChange={handleConfigChange}
                        onRefreshOverview={refresh}
                        onRun={(jobId) => void handleRun(jobId)}
                        onHistory={openHistory}
                      />
                    )
                  }
                  const i18nEntry = SCHEDULED_JOB_I18N[job.jobId]
                  return (
                    <JobCard
                      key={`${job.source}:${job.jobId}`}
                      title={i18nEntry ? t(i18nEntry.labelKey) : job.jobId}
                      description={i18nEntry ? t(i18nEntry.descKey) : t('admin:jobs.runtime.genericDesc')}
                      badge={
                        <PixelBadge tone="default">{t('admin:jobs.sourceSpring')}</PixelBadge>
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
                  const i18nEntry = MQ_CONSUMER_I18N[mq.id]
                  return (
                    <JobCard
                      key={mq.id}
                      title={i18nEntry ? t(i18nEntry.labelKey) : mq.id}
                      description={i18nEntry ? t(i18nEntry.descKey) : mq.queue}
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
                  const i18nEntry = BATCH_JOB_I18N[batch.jobType]
                  return (
                    <JobCard
                      key={batch.jobType}
                      title={i18nEntry ? t(i18nEntry.labelKey) : batch.jobType}
                      description={i18nEntry ? t(i18nEntry.descKey) : batch.handler}
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

      <AppModalShell
        open={historyJob != null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryJob(null)
            setHistoryRuns([])
            setHistoryError(null)
          }
        }}
        size="detail"
        title={
          historyJob
            ? t('admin:jobs.manualRun.historyTitle', { job: historyJob.title })
            : t('admin:jobs.manualRun.history')
        }
        bodyClassName="space-y-3 overflow-y-auto px-4 pb-4 pt-2"
      >
        {historyError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {historyError}
          </p>
        ) : null}
        {historyLoading && historyRuns.length === 0 ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : historyRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin:jobs.manualRun.historyEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {historyRuns.map((run) => (
              <ScheduledJobRunRow key={run.id} run={run} locale={locale} />
            ))}
          </div>
        )}
        {historyJob ? (
          <div className="flex justify-end border-t border-border pt-3">
            <AdminButtonOutline
              disabled={historyLoading}
              onClick={() => void loadHistory(historyJob.jobId)}
            >
              <RefreshCw className={`size-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              {t('admin:jobs.refresh')}
            </AdminButtonOutline>
          </div>
        ) : null}
      </AppModalShell>
    </AdminDataPage>
  )
}
