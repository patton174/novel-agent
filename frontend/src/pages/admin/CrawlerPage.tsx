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
import { OrchestratorLogTerminal } from '@/components/admin/OrchestratorLogTerminal'
import { Button } from '@/components/ui/button'
import { ContentPending } from '@/components/loading/ContentPending'
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
import { confirmAction } from '@/stores/confirmDialogStore'
import { appToast } from '@/stores/appToastStore'

const DEFAULT_GOAL =
  '把链接中的小说全部章节抓取并清洗正文，入库公共书库（书籍页、目录页、章节页均可）'

type JobFilter = 'all' | 'active' | 'failed'

export default function CrawlerPage() {
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

  const loadJobs = useCallback(async () => {
    try {
      const jobPage = await fetchCrawlJobs(1, 50)
      setJobs(jobPage.list)
      setDetailJob((current) => {
        if (!current) return current
        return jobPage.list.find((j) => j.id === current.id) ?? current
      })
    } catch (err) {
      setJobs([])
      appToast.error(err instanceof Error ? err.message : '子任务加载失败')
    } finally {
      setJobsLoading(false)
    }
  }, [])

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
    await Promise.all([loadJobs(), loadOrchMeta()])
    setLogRefreshKey((k) => k + 1)
  }, [loadJobs, loadOrchMeta])

  const handleSetOrchestratorGoal = async () => {
    if (!localGoal) {
      appToast.error('请输入总目标')
      return
    }
    setActingKey('orch-goal')
    try {
      const state = await setOrchestratorGoal(localGoal)
      setOrchState(state)
      setOrchGoal(state.goal || localGoal)
      setGoalDirty(false)
      setLogRefreshKey((k) => k + 1)
      appToast.success('目标已设定，主编排 Agent 将开始工作')
      void loadJobs()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '设定失败')
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
      appToast.success('已唤醒')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '唤醒失败')
    } finally {
      setActingKey(null)
    }
  }

  const handleClearOrchestrator = async () => {
    if (!(await confirmAction({
      title: '清空总目标',
      description: '将清空主编排目标、进入睡眠，并清除决策日志。',
      confirmLabel: '清空',
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
      appToast.success('目标与日志已清空，进入睡眠')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '操作失败')
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
          title: '删除子任务',
          description: '确定删除该任务？日志将一并清除。',
          confirmLabel: '删除',
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
          appToast.success('已删除')
        } catch (err) {
          appToast.error(err instanceof Error ? err.message : '删除失败')
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
        appToast.success('操作成功')
        void loadJobs()
      } catch (err) {
        appToast.error(err instanceof Error ? err.message : '操作失败')
        void loadJobs()
      } finally {
        setActingKey(null)
      }
    },
    [detailJob?.id, loadJobs, patchJob],
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

  const orchBanner = orchState?.agentEnabled === false
    ? 'orchestrator-disabled'
    : orchState?.agentLlmConfigured === false
      ? 'llm-missing'
      : null

  const orchBusy = actingKey?.startsWith('orch-') ?? false

  return (
    <AppPageStack className="gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <AppShellCard>
          <AppShellCardHeader
            title="主编排控制"
            description={`并行 ${orchState?.runningJobCount ?? 0}/${orchState?.maxConcurrentJobs ?? 3}`}
            action={
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  isOrchRunning
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {isOrchRunning ? '运行中' : '睡眠'}
              </span>
            }
          />
          <AppShellCardBody className="space-y-4">
          {incompleteCount > 0 ? (
            <Link
              to="/admin/catalog"
              className="inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              书库未完成 {incompleteCount} 本 →
            </Link>
          ) : null}

        {orchBanner === 'orchestrator-disabled' ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            Worker 上主编排未启用，请设置{' '}
            <code className="rounded bg-background/80 px-1 py-0.5 text-xs">CRAWL_ORCHESTRATOR_ENABLED=true</code>{' '}
            并重启 python-ai。
          </div>
        ) : orchBanner === 'llm-missing' ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            主编排 LLM 未配置，请检查 python-ai/.env 中的 OPENAI_API_KEY。
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            总目标
          </label>
          <textarea
            value={orchGoal}
            onChange={(e) => {
              setOrchGoal(e.target.value)
              setGoalDirty(true)
            }}
            rows={2}
            disabled={orchBlocked || orchBusy}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            placeholder={DEFAULT_GOAL}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canSetGoal || orchBusy}
            onClick={() => void handleSetOrchestratorGoal()}
          >
            {!hasServerGoal || isOrchSleeping ? '设定并唤醒' : '更新目标'}
          </Button>
          <Button
            variant="secondary"
            disabled={!canWake || orchBusy}
            onClick={() => void handleWakeOrchestrator()}
          >
            唤醒
          </Button>
          <Button
            variant="outline"
            disabled={!canClear || orchBusy}
            onClick={() => void handleClearOrchestrator()}
          >
            清空 / 睡眠
          </Button>
        </div>
          </AppShellCardBody>
        </AppShellCard>

        <AppShellCard className="flex min-h-[280px] flex-col">
          <AppShellCardHeader title="主编排决策日志" />
          <AppShellCardBody className="flex min-h-0 flex-1 flex-col pt-2">
            <OrchestratorLogTerminal
              status={orchState?.status}
              refreshKey={logRefreshKey}
              clearKey={logClearKey}
              paused={!pageVisible}
            />
          </AppShellCardBody>
        </AppShellCard>
      </div>

      <AppShellCard>
        <AppShellCardHeader
          title="子任务列表"
          description="点击行查看详情与日志"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshAll()}
              disabled={jobsLoading && jobs === null}
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${jobsLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          }
        />
        <AppShellCardBody className="space-y-4 pt-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {(
              [
                ['all', '全部', jobCounts.all],
                ['active', '进行中', jobCounts.active],
                ['failed', '失败/取消', jobCounts.failed],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setJobFilter(key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
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
          <ContentPending label="正在加载爬虫任务" />
        ) : filteredJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {jobFilter === 'all'
              ? '暂无子任务。设定主编排目标后，Agent 将自动创建并调度。'
              : '当前筛选下没有子任务。'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filteredJobs.map((job) => (
              <CrawlJobRow
                key={job.id}
                job={job}
                actingKey={actingKey}
                onOpen={openDetail}
                onAction={runAction}
              />
            ))}
          </div>
        )}
        </AppShellCardBody>
      </AppShellCard>

      <CrawlJobDetailModal
        job={detailJob}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailJob(null)
        }}
      />
    </AppPageStack>
  )
}
