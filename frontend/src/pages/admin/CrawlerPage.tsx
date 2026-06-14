import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import {
  cancelCrawlJob,
  deleteCrawlJob,
  fetchCrawlJobs,
  pauseCrawlJob,
  startCrawlJob,
  type CrawlJob,
} from '@/api/crawlAdminApi'
import {
  clearOrchestratorGoal,
  fetchOrchestratorState,
  setOrchestratorGoal,
  wakeOrchestrator,
  type OrchestratorState,
} from '@/api/orchestratorAdminApi'
import { fetchIncompleteCatalog } from '@/api/catalogAdminApi'
import { CrawlJobDetailModal } from '@/components/admin/CrawlJobDetailModal'
import { CrawlJobRow } from '@/components/admin/CrawlJobRow'
import { AdminCollapsibleCard } from '@/components/admin/AdminCollapsibleCard'
import { OrchestratorLogTerminal } from '@/components/admin/OrchestratorLogTerminal'
import { Button } from '@/components/ui/button'
import { AdminPagination } from '@/components/layout/AdminPagination'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import {
  type CrawlJobAction,
  crawlJobOptimisticPatch,
} from '@/pages/admin/crawlJobUi'
import { cn } from '@/lib/utils'
import { usePageVisible } from '@/hooks/usePageVisible'
import { confirmAction } from '@/stores/appDialog'
import { appToast } from '@/stores/appToastStore'

const JOBS_PAGE_SIZE = 20
const JOBS_FETCH_SIZE = 50

type JobFilter = 'all' | 'active' | 'failed'

export default function CrawlerPage() {
  const { t } = useTranslation(['admin'])
  const DEFAULT_GOAL = t('admin:crawler.defaultGoal')
  useMarkRouteSeen()
  const location = useLocation()
  const pageVisible = usePageVisible()
  const [jobs, setJobs] = useState<CrawlJob[] | null>(null)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [actingKey, setActingKey] = useState<string | null>(null)
  const [detailJob, setDetailJob] = useState<CrawlJob | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [orchState, setOrchState] = useState<OrchestratorState | null>(null)
  const [orchGoal, setOrchGoal] = useState('')
  const [goalDirty, setGoalDirty] = useState(false)
  const [incompleteCount, setIncompleteCount] = useState(0)
  const [logRefreshKey, setLogRefreshKey] = useState(0)
  const [logClearKey, setLogClearKey] = useState(0)
  const [jobFilter, setJobFilter] = useState<JobFilter>('all')
  const [jobPage, setJobPage] = useState(1)
  const [jobsTotalCount, setJobsTotalCount] = useState(0)
  const jobsFetchPageRef = useRef(1)
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(false)
  const orchGoalSyncedRef = useRef(false)

  const serverGoal = orchState?.goal?.trim() ?? ''
  const localGoal = orchGoal.trim()
  const isOrchRunning = orchState?.status === 'RUNNING'
  const isOrchSleeping = !isOrchRunning
  const hasServerGoal = Boolean(serverGoal)
  const goalMatchesServer = localGoal === serverGoal
  const orchBlocked = orchState?.agentEnabled === false || orchState?.agentLlmConfigured === false

  const canSetGoal =
    !orchBlocked &&
    Boolean(localGoal) &&
    (goalDirty || !goalMatchesServer || (isOrchSleeping && hasServerGoal) || !hasServerGoal)

  const canWake =
    !orchBlocked && hasServerGoal && isOrchSleeping && goalMatchesServer && !goalDirty

  const canClear = hasServerGoal || isOrchRunning

  const hasRunningJob = useMemo(
    () => (jobs ?? []).some((job) => job.status === 'RUNNING' || job.status === 'PENDING'),
    [jobs],
  )

  const loadJobs = useCallback(async (append = false) => {
    try {
      const page = append ? jobsFetchPageRef.current + 1 : 1
      const jobPage = await fetchCrawlJobs(page, JOBS_FETCH_SIZE)
      setJobs((prev) => {
        const next = append && prev ? [...prev, ...jobPage.list] : jobPage.list
        setDetailJob((current) => {
          if (!current) return current
          return next.find((j) => j.id === current.id) ?? current
        })
        return next
      })
      setJobsTotalCount(jobPage.totalCount)
      jobsFetchPageRef.current = page
    } catch (err) {
      if (!append) setJobs([])
      appToast.error(err instanceof Error ? err.message : t('admin:crawler.loadJobsFail'))
    } finally {
      setJobsLoading(false)
    }
  }, [t])

  const loadOrchMeta = useCallback(async () => {
    try {
      const [orch, inc] = await Promise.all([
        fetchOrchestratorState(),
        fetchIncompleteCatalog(50).catch(() => []),
      ])
      setOrchState(orch)
      if (!goalDirty && !orchGoalSyncedRef.current) {
        setOrchGoal(orch.goal || DEFAULT_GOAL)
        orchGoalSyncedRef.current = true
      } else if (!goalDirty && orch.goal) {
        setOrchGoal(orch.goal)
      }
      setIncompleteCount(inc.length)
    } catch {
      /* 编排状态可选 */
    }
  }, [goalDirty])

  const refreshAll = useCallback(async () => {
    setJobsLoading(true)
    jobsFetchPageRef.current = 0
    await Promise.all([loadJobs(false), loadOrchMeta()])
    setLogRefreshKey((k) => k + 1)
  }, [loadJobs, loadOrchMeta])

  const handleLoadMoreJobs = async () => {
    if (loadingMoreJobs || (jobs?.length ?? 0) >= jobsTotalCount) return
    setLoadingMoreJobs(true)
    try {
      await loadJobs(true)
    } finally {
      setLoadingMoreJobs(false)
    }
  }

  const handleSetOrchestratorGoal = async () => {
    if (!localGoal) {
      appToast.error(t('admin:crawler.inputGoal'))
      return
    }
    setActingKey('orch-goal')
    try {
      const state = await setOrchestratorGoal(localGoal)
      setOrchState(state)
      setOrchGoal(state.goal || localGoal)
      setGoalDirty(false)
      setLogRefreshKey((k) => k + 1)
      appToast.success(t('admin:crawler.goalSet'))
      void loadJobs()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:crawler.setGoalFail'))
    } finally {
      setActingKey(null)
    }
  }

  const handleWakeOrchestrator = async () => {
    setActingKey('orch-wake')
    try {
      const state = await wakeOrchestrator()
      setOrchState(state)
      setLogRefreshKey((k) => k + 1)
      appToast.success(t('admin:crawler.woke'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:crawler.wakeFail'))
    } finally {
      setActingKey(null)
    }
  }

  const handleClearOrchestrator = async () => {
    if (!(await confirmAction({
      title: t('admin:crawler.clearTitle'),
      description: t('admin:crawler.clearDesc'),
      confirmLabel: t('admin:crawler.clearBtn'),
      danger: true,
    }))) {
      return
    }
    setActingKey('orch-clear')
    try {
      const state = await clearOrchestratorGoal()
      setOrchState(state)
      setOrchGoal(DEFAULT_GOAL)
      setGoalDirty(false)
      orchGoalSyncedRef.current = true
      setLogClearKey((k) => k + 1)
      appToast.success(t('admin:crawler.cleared'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:crawler.actionFail'))
    } finally {
      setActingKey(null)
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  useEffect(() => {
    if (!pageVisible) return
    const orchLive = isOrchRunning
    const jobsLive = hasRunningJob
    const intervalMs = orchLive || jobsLive ? 4000 : 12000
    const timer = window.setInterval(() => {
      void loadOrchMeta()
      if (jobsLive || orchLive) void loadJobs()
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [pageVisible, hasRunningJob, isOrchRunning, loadJobs, loadOrchMeta])

  const patchJob = useCallback((jobId: string, patch: Partial<CrawlJob>) => {
    setJobs((prev) => (prev ?? []).map((job) => (job.id === jobId ? { ...job, ...patch } : job)))
    setDetailJob((current) => (current?.id === jobId ? { ...current, ...patch } : current))
  }, [])

  const openDetail = useCallback((job: CrawlJob) => {
    setDetailJob(job)
    setDetailOpen(true)
  }, [])

  useEffect(() => {
    const openJobId = (location.state as { openJobId?: string } | null)?.openJobId
    if (!openJobId || !jobs) return
    const job = jobs.find((j) => j.id === openJobId)
    if (job) openDetail(job)
    window.history.replaceState({}, document.title)
  }, [location.state, jobs, openDetail])

  const runAction = useCallback(
    async (job: CrawlJob, action: CrawlJobAction) => {
      const key = `${job.id}:${action}`
      setActingKey(key)

      if (action === 'delete') {
        if (!(await confirmAction({
          title: t('admin:crawler.deleteTitle'),
          description: t('admin:crawler.deleteDesc'),
          confirmLabel: t('admin:crawler.deleteBtn'),
          danger: true,
        }))) {
          setActingKey(null)
          return
        }
        setJobs((prev) => (prev ?? []).filter((item) => item.id !== job.id))
        if (detailJob?.id === job.id) {
          setDetailOpen(false)
          setDetailJob(null)
        }
        try {
          await deleteCrawlJob(job.id)
          appToast.success(t('admin:crawler.deleted'))
        } catch (err) {
          appToast.error(err instanceof Error ? err.message : t('admin:crawler.deleteFail'))
          void loadJobs()
        } finally {
          setActingKey(null)
        }
        return
      }

      const optimistic = crawlJobOptimisticPatch(action)
      if (optimistic) patchJob(job.id, optimistic)

      try {
        if (action === 'start') await startCrawlJob(job.id)
        else if (action === 'pause') await pauseCrawlJob(job.id)
        else await cancelCrawlJob(job.id)
        appToast.success(t('admin:crawler.actionSuccess'))
        void loadJobs()
      } catch (err) {
        appToast.error(err instanceof Error ? err.message : t('admin:crawler.actionFail'))
        void loadJobs()
      } finally {
        setActingKey(null)
      }
    },
    [detailJob?.id, loadJobs, patchJob, t],
  )

  const filteredJobs = useMemo(() => {
    const list = jobs ?? []
    if (jobFilter === 'active') {
      return list.filter((j) => j.status === 'RUNNING' || j.status === 'PENDING')
    }
    if (jobFilter === 'failed') {
      return list.filter((j) => j.status === 'FAILED' || j.status === 'CANCELLED')
    }
    return list
  }, [jobs, jobFilter])

  const jobCounts = useMemo(() => {
    const list = jobs ?? []
    return {
      all: list.length,
      active: list.filter((j) => j.status === 'RUNNING' || j.status === 'PENDING').length,
      failed: list.filter((j) => j.status === 'FAILED' || j.status === 'CANCELLED').length,
    }
  }, [jobs])

  useEffect(() => {
    setJobPage(1)
  }, [jobFilter])

  const jobTotalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PAGE_SIZE))

  const paginatedJobs = useMemo(() => {
    const start = (jobPage - 1) * JOBS_PAGE_SIZE
    return filteredJobs.slice(start, start + JOBS_PAGE_SIZE)
  }, [filteredJobs, jobPage])

  const orchBanner = orchState?.agentEnabled === false
    ? 'orchestrator-disabled'
    : orchState?.agentLlmConfigured === false
      ? 'llm-missing'
      : null

  const orchBusy = actingKey?.startsWith('orch-') ?? false

  return (
    <AppPageStack className="gap-5">
      <AppShellCard className="order-1 md:order-2">
        <AppShellCardHeader
          title={t('admin:crawler.jobsTitle')}
          description={t('admin:crawler.jobsDesc')}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshAll()}
              disabled={jobsLoading && jobs === null}
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${jobsLoading ? 'animate-spin' : ''}`} />
              {t('admin:crawler.refresh')}
            </Button>
          }
        />
        <AppShellCardBody className="space-y-4 pt-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {(
              [
                ['all', t('admin:crawler.filterAll'), jobCounts.all],
                ['active', t('admin:crawler.filterActive'), jobCounts.active],
                ['failed', t('admin:crawler.filterFailed'), jobCounts.failed],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setJobFilter(key as JobFilter)
                  setJobPage(1)
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  jobFilter === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label} {count > 0 ? `(${count})` : ''}
              </button>
            ))}
          </div>

        {jobsLoading && jobs === null ? (
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {jobFilter === 'all'
              ? t('admin:crawler.emptyAll')
              : t('admin:crawler.emptyFiltered')}
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {paginatedJobs.map((job) => (
                <CrawlJobRow
                  key={job.id}
                  job={job}
                  actingKey={actingKey}
                  onOpen={openDetail}
                  onAction={runAction}
                />
              ))}
            </div>
            <AdminPagination
              pageCurrent={jobPage}
              totalPages={jobTotalPages}
              totalCount={filteredJobs.length}
              loading={jobsLoading}
              onPageChange={setJobPage}
            />
            {(jobs?.length ?? 0) < jobsTotalCount ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={loadingMoreJobs}
                onClick={() => void handleLoadMoreJobs()}
              >
                {loadingMoreJobs
                  ? t('admin:crawler.loadMore')
                  : t('admin:crawler.loadMoreBtn', { shown: jobs?.length ?? 0, total: jobsTotalCount })}
              </Button>
            ) : null}
          </>
        )}
        </AppShellCardBody>
      </AppShellCard>

      <div className="order-2 grid gap-5 md:order-1 xl:grid-cols-2">
        <AdminCollapsibleCard
          title={t('admin:crawler.orchTitle')}
          description={t('admin:crawler.orchDesc', { running: orchState?.runningJobCount ?? 0, max: orchState?.maxConcurrentJobs ?? 3 })}
          defaultMobileOpen={false}
          action={
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                isOrchRunning
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {isOrchRunning ? t('admin:crawler.orchRunning') : t('admin:crawler.orchSleeping')}
            </span>
          }
          bodyClassName="space-y-4"
        >
          {incompleteCount > 0 ? (
            <Link
              to="/admin/catalog"
              className="inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              {t('admin:crawler.incompleteCatalog', { count: incompleteCount })}
            </Link>
          ) : null}

        {orchBanner === 'orchestrator-disabled' ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {t('admin:crawler.orchDisabled')}
          </div>
        ) : orchBanner === 'llm-missing' ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {t('admin:crawler.llmMissing')}
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t('admin:crawler.goalLabel')}
          </label>
          <textarea
            value={orchGoal}
            onChange={(e) => {
              setOrchGoal(e.target.value)
              setGoalDirty(true)
            }}
            rows={5}
            className="min-h-[5.5rem] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 max-md:min-h-[7rem]"
            placeholder={DEFAULT_GOAL}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            disabled={!canSetGoal || orchBusy}
            onClick={() => void handleSetOrchestratorGoal()}
          >
            {!hasServerGoal || isOrchSleeping ? t('admin:crawler.setAndWake') : t('admin:crawler.updateGoal')}
          </Button>
          <Button
            variant="secondary"
            disabled={!canWake || orchBusy}
            onClick={() => void handleWakeOrchestrator()}
          >
            {t('admin:crawler.wake')}
          </Button>
          <Button
            variant="outline"
            disabled={!canClear || orchBusy}
            onClick={() => void handleClearOrchestrator()}
          >
            {t('admin:crawler.clearAndSleep')}
          </Button>
        </div>
        </AdminCollapsibleCard>

        <AdminCollapsibleCard
          title={t('admin:crawler.logTitle')}
          defaultMobileOpen={false}
          className="flex min-h-0 flex-col max-md:min-h-[200px] md:min-h-[280px]"
          bodyClassName="flex min-h-0 flex-1 flex-col pt-2"
        >
            <OrchestratorLogTerminal
              status={orchState?.status}
              refreshKey={logRefreshKey}
              clearKey={logClearKey}
              paused={!pageVisible}
            />
        </AdminCollapsibleCard>
      </div>

      <CrawlJobDetailModal
        job={detailJob}
        open={detailOpen}
        actingKey={actingKey}
        pollPaused={!pageVisible}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailJob(null)
        }}
        onAction={runAction}
      />
    </AppPageStack>
  )
}
