import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Wand2,
} from 'lucide-react'
import {
  buildCrawlConfigJson,
  cancelCrawlJob,
  createCrawlJob,
  deleteCrawlJob,
  fetchCrawlJobs,
  parseCrawlJobGoal,
  pauseCrawlJob,
  previewCrawl,
  startCrawlJob,
  type CrawlJob,
  type CrawlPreviewResult,
} from '@/api/crawlAdminApi'
import { CrawlJobDetailModal } from '@/components/admin/CrawlJobDetailModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [jobs, setJobs] = useState<CrawlJob[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [actingKey, setActingKey] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewResult, setPreviewResult] = useState<CrawlPreviewResult | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [detailJob, setDetailJob] = useState<CrawlJob | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const hasRunningJob = useMemo(
    () => (jobs ?? []).some((job) => job.status === 'RUNNING' || job.status === 'PENDING'),
    [jobs],
  )

  const load = useCallback(async () => {
    try {
      const jobPage = await fetchCrawlJobs(1, 50)
      setJobs(jobPage.list)
      setDetailJob((current) => {
        if (!current) {
          return current
        }
        return jobPage.list.find((j) => j.id === current.id) ?? current
      })
    } catch (err) {
      setJobs([])
      appToast.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const intervalMs = hasRunningJob ? 2500 : 8000
    const timer = window.setInterval(() => void load(), intervalMs)
    return () => window.clearInterval(timer)
  }, [load, hasRunningJob])

  const patchJob = useCallback((jobId: string, patch: Partial<CrawlJob>) => {
    setJobs((prev) => (prev ?? []).map((job) => (job.id === jobId ? { ...job, ...patch } : job)))
    setDetailJob((current) => (current?.id === jobId ? { ...current, ...patch } : current))
  }, [])

  const openDetail = (job: CrawlJob) => {
    setDetailJob(job)
    setDetailOpen(true)
  }

  const handlePreview = async () => {
    if (!sourceUrl.trim()) {
      appToast.error('请输入链接')
      return
    }
    if (!goal.trim()) {
      appToast.error('请描述爬取目标')
      return
    }
    setPreviewing(true)
    setPreviewResult(null)
    try {
      const result = await previewCrawl({
        sourceUrl: sourceUrl.trim(),
        configJson: buildCrawlConfigJson(goal),
      })
      setPreviewResult(result)
      if (result.ok) {
        appToast.success(result.message || '预览成功')
      } else {
        appToast.error(result.message || '预览失败')
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '预览失败')
    } finally {
      setPreviewing(false)
    }
  }

  const handleCreate = async () => {
    if (!sourceUrl.trim()) {
      appToast.error('请输入链接')
      return
    }
    if (!goal.trim()) {
      appToast.error('请描述爬取目标')
      return
    }
    setActingKey('create')
    try {
      const job = await createCrawlJob({
        sourceUrl: sourceUrl.trim(),
        configJson: buildCrawlConfigJson(goal),
      })
      await startCrawlJob(job.id)
      appToast.success('AI 代理已启动，点击任务卡片查看日志')
      await load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setActingKey(null)
    }
  }

  const runAction = async (job: CrawlJob, action: CrawlJobAction) => {
    const key = `${job.id}:${action}`
    setActingKey(key)

    if (action === 'delete') {
      if (!window.confirm('确定删除该任务？日志将一并清除。')) {
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
    if (optimistic) {
      patchJob(job.id, optimistic)
    }

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
    if (actions.length === 0) {
      return null
    }
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
            基于 Scrapling 抓取网页，AI 根据你的目标自主导航、解析并持续执行至完成
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">新建任务</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">链接</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="任意小说相关 URL（书籍页 / 目录 / 章节 / 阅读页）"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">目标（自然语言）</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
              placeholder="例如：爬取站点热度第一的书籍，最多 200 章"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={previewing} onClick={() => void handlePreview()}>
              {previewing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
              AI 预览
            </Button>
            <Button type="button" disabled={actingKey === 'create'} onClick={() => void handleCreate()}>
              {actingKey === 'create' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              启动 AI 代理
            </Button>
          </div>
          {previewResult ? (
            <div
              className={cn(
                'rounded-xl border px-4 py-3 text-sm',
                previewResult.ok
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-destructive/30 bg-destructive/5',
              )}
            >
              {previewResult.ok ? (
                <p className="font-medium">{previewResult.title || previewResult.message}</p>
              ) : (
                <p className="text-destructive">{previewResult.message || '预览失败'}</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">任务列表</h2>
        {loading && jobs === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : jobs!.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无爬虫任务</p>
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
          if (!open) {
            setDetailJob(null)
          }
        }}
      />
    </div>
  )
}
