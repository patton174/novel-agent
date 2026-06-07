import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bot,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Square,
  Trash2,
} from 'lucide-react'
import {
  cancelCrawlJob,
  deleteCrawlJob,
  fetchCrawlJobs,
  parseCrawlJobGoal,
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
import { OrchestratorLogTerminal } from '@/components/admin/OrchestratorLogTerminal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type CrawlJobAction,
  crawlJobActions,
  crawlJobOptimisticPatch,
  crawlJobProgressPercent,
  crawlJobStatusClass,
  crawlJobStatusLabel,
  truncateError,
} from '@/pages/admin/crawlJobUi'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/stores/confirmDialogStore'
import { appToast } from '@/stores/appToastStore'

const DEFAULT_GOAL =
  '把链接中的小说全部章节抓取并清洗正文，入库公共书库（书籍页、目录页、章节页均可）'

const ACTION_META: Record<
  CrawlJobAction,
  { label: string; icon: typeof Play; variant?: 'outline' | 'destructive' }
> = {
  start: { label: '启动', icon: Play },
  pause: { label: '暂停', icon: Pause },
  cancel: { label: '取消', icon: Square },
  delete: { label: '删除', icon: Trash2, variant: 'destructive' },
}

export default function CrawlerPage() {
  const location = useLocation()
  const [jobs, setJobs] = useState<CrawlJob[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [actingKey, setActingKey] = useState<string | null>(null)
  const [detailJob, setDetailJob] = useState<CrawlJob | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [orchState, setOrchState] = useState<OrchestratorState | null>(null)
  const [orchGoal, setOrchGoal] = useState('')
  const [incompleteCount, setIncompleteCount] = useState(0)
  const [logRefreshKey, setLogRefreshKey] = useState(0)

  const hasRunningJob = useMemo(
    () => (jobs ?? []).some((job) => job.status === 'RUNNING' || job.status === 'PENDING'),
    [jobs],
  )

  const load = useCallback(async () => {
    try {
      const [jobPage, orch, inc] = await Promise.all([
        fetchCrawlJobs(1, 50),
        fetchOrchestratorState().catch(() => null),
        fetchIncompleteCatalog(50).catch(() => []),
      ])
      setJobs(jobPage.list)
      if (orch) {
        setOrchState(orch)
        setOrchGoal((prev) => (prev || orch.goal || DEFAULT_GOAL))
      }
      setIncompleteCount(inc.length)
      setDetailJob((current) => {
        if (!current) return current
        return jobPage.list.find((j) => j.id === current.id) ?? current
      })
    } catch (err) {
      setJobs([])
      appToast.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSetOrchestratorGoal = async () => {
    if (!orchGoal.trim()) {
      appToast.error('请输入总目标')
      return
    }
    setActingKey('orch-goal')
    try {
      const state = await setOrchestratorGoal(orchGoal.trim())
      setOrchState(state)
      setLogRefreshKey((k) => k + 1)
      appToast.success('目标已设定，主编排 Agent 将开始工作')
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
    setActingKey('orch-clear')
    try {
      const state = await clearOrchestratorGoal()
      setOrchState(state)
      appToast.success('目标已清空，进入睡眠')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setActingKey(null)
    }
  }

  const runningJobs = useMemo(
    () => (jobs ?? []).filter((j) => j.status === 'RUNNING' || j.status === 'PENDING'),
    [jobs],
  )

  useEffect(() => {
    void load()
    const intervalMs = hasRunningJob || orchState?.status === 'RUNNING' ? 2500 : 8000
    const timer = window.setInterval(() => void load(), intervalMs)
    return () => window.clearInterval(timer)
  }, [load, hasRunningJob, orchState?.status])

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

  const runAction = async (job: CrawlJob, action: CrawlJobAction) => {
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
        void load()
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
      void load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '操作失败')
      void load()
    } finally {
      setActingKey(null)
    }
  }

  const renderJobActions = (job: CrawlJob) => {
    const actions = crawlJobActions(job.status)
    if (actions.length === 0) return null
    return (
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
                void runAction(job, action)
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
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI 自动爬虫</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            主编排 Agent 常驻决策并自动创建子任务（最多 10 并行），下方可查看各子任务运行日志
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              orchState?.status === 'RUNNING'
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {orchState?.status === 'RUNNING' ? '运行中' : '睡眠'}
          </span>
          <span className="text-sm text-muted-foreground">
            子任务 {orchState?.runningJobCount ?? 0}/{orchState?.maxConcurrentJobs ?? 10}
          </span>
          {incompleteCount > 0 ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/admin/catalog">未完成书目 {incompleteCount}</Link>
            </Button>
          ) : null}
        </div>

        {orchState?.agentEnabled === false ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            Worker 上主编排 Agent 未启用。请在 python-ai/.env 设置{' '}
            <code className="rounded bg-background/80 px-1 py-0.5 text-xs">CRAWL_ORCHESTRATOR_ENABLED=true</code>{' '}
            并重启 python-ai 容器；唤醒后会写入诊断日志。
          </div>
        ) : orchState?.agentLlmConfigured === false ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            LLM API 未配置，主编排无法决策。请检查 python-ai/.env 中的 API Key。
          </div>
        ) : null}

        {orchState?.goal ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">当前总目标</p>
            <p className="mt-1 whitespace-pre-wrap">{orchState.goal}</p>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            总目标（唤醒主编排）
          </label>
          <textarea
            value={orchGoal}
            onChange={(e) => setOrchGoal(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="例如：续爬书库中所有未完成的书；或爬取某站网游分类"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={actingKey != null} onClick={() => void handleSetOrchestratorGoal()}>
            设定并唤醒
          </Button>
          <Button
            variant="secondary"
            disabled={actingKey != null}
            onClick={() => void handleWakeOrchestrator()}
          >
            唤醒
          </Button>
          <Button
            variant="outline"
            disabled={actingKey != null}
            onClick={() => void handleClearOrchestrator()}
          >
            清空目标 / 睡眠
          </Button>
        </div>

        {runningJobs.length > 0 ? (
          <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">运行中子任务</p>
            <div className="flex flex-wrap gap-2">
              {runningJobs.slice(0, 10).map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => openDetail(job)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs transition-colors hover:bg-muted/50"
                >
                  {job.title || job.sourceUrl.slice(0, 24)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-semibold">主编排决策日志</p>
          <OrchestratorLogTerminal status={orchState?.status} refreshKey={logRefreshKey} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">子任务列表</h2>
          <span className="text-sm text-muted-foreground">由主编排自动创建，点击查看日志</span>
        </div>
        {loading && jobs === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : jobs!.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            暂无子任务。设定主编排目标后，Agent 将自动创建并调度子任务。
          </p>
        ) : (
          <div className="space-y-2">
            {jobs!.map((job) => {
              const percent = crawlJobProgressPercent(job)
              const jobGoal = parseCrawlJobGoal(job.configJson)
              const errorPreview = truncateError(job.errorMessage)
              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(job)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openDetail(job)
                    }
                  }}
                  className={cn(
                    'group flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30 lg:flex-row lg:items-center lg:justify-between',
                    job.status === 'RUNNING'
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
                        查看日志
                        <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{job.sourceUrl}</p>
                    {jobGoal ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        目标：{jobGoal}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        进度 {job.chaptersDone ?? 0}/{job.chaptersTotal ?? '?'}
                      </span>
                      {job.catalogNovelId ? (
                        <span>书库 {job.catalogNovelId.slice(0, 8)}…</span>
                      ) : null}
                      {percent != null ? <span>{percent}%</span> : null}
                    </div>
                    {percent != null ? (
                      <div className="mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
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
                  {renderJobActions(job)}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <CrawlJobDetailModal
        job={detailJob}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailJob(null)
        }}
      />
    </div>
  )
}
