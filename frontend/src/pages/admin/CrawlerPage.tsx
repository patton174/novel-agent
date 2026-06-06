import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, Loader2, Pause, Play, Plus, RefreshCw, Square, Wand2 } from 'lucide-react'
import {
  buildCrawlConfigJson,
  cancelCrawlJob,
  createCrawlJob,
  fetchCrawlJobs,
  parseCrawlJobGoal,
  pauseCrawlJob,
  previewCrawl,
  startCrawlJob,
  type CrawlJob,
  type CrawlPreviewResult,
} from '@/api/crawlAdminApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CrawlLogTerminal } from '@/components/admin/CrawlLogTerminal'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'

const DEFAULT_GOAL =
  '把链接中的小说全部章节抓取并清洗正文，入库公共书库（书籍页、目录页、章节页均可）'

function statusLabel(status: CrawlJob['status']): string {
  const map: Record<CrawlJob['status'], string> = {
    PENDING: '待启动',
    RUNNING: '运行中',
    PAUSED: '已暂停',
    COMPLETED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消',
  }
  return map[status] ?? status
}

function progressPercent(job: CrawlJob): number | null {
  const total = job.chaptersTotal
  const done = job.chaptersDone ?? 0
  if (total == null || total <= 0) {
    return null
  }
  return Math.min(100, Math.round((done / total) * 100))
}

export default function CrawlerPage() {
  const [jobs, setJobs] = useState<CrawlJob[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewResult, setPreviewResult] = useState<CrawlPreviewResult | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [goal, setGoal] = useState(DEFAULT_GOAL)

  const hasRunningJob = useMemo(
    () => (jobs ?? []).some((job) => job.status === 'RUNNING' || job.status === 'PENDING'),
    [jobs],
  )

  const load = useCallback(async () => {
    try {
      const jobPage = await fetchCrawlJobs(1, 50)
      setJobs(jobPage.list)
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
    setActingId('create')
    try {
      const job = await createCrawlJob({
        sourceUrl: sourceUrl.trim(),
        configJson: buildCrawlConfigJson(goal),
      })
      await startCrawlJob(job.id)
      appToast.success('AI 代理已启动，可在下方日志查看执行过程')
      await load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setActingId(null)
    }
  }

  const runAction = async (jobId: string, action: 'start' | 'pause' | 'cancel') => {
    setActingId(jobId)
    try {
      if (action === 'start') await startCrawlJob(jobId)
      else if (action === 'pause') await pauseCrawlJob(jobId)
      else await cancelCrawlJob(jobId)
      appToast.success('操作成功')
      await load()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI 自动爬虫</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            基于{' '}
            <a
              href="https://github.com/d4vinci/Scrapling"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Scrapling
            </a>{' '}
            抓取网页，AI 根据你的目标自主导航、解析并持续执行至完成
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
              placeholder="例如：把这本小说全部章节抓下来入库；或：只抓前 50 章，反爬严的话用浏览器模式"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              无需配置 CSS 选择器。AI 会理解目标并自动跳转目录、逐章 Scrapling 抓取、LLM 清洗正文。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={previewing} onClick={() => void handlePreview()}>
              {previewing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
              AI 预览
            </Button>
            <Button type="button" disabled={actingId === 'create'} onClick={() => void handleCreate()}>
              {actingId === 'create' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              启动 AI 代理
            </Button>
          </div>

          {previewing ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
              AI 正在理解目标并探测页面…
            </div>
          ) : previewResult ? (
            <div
              className={cn(
                'rounded-xl border px-4 py-3 text-sm',
                previewResult.ok
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-destructive/30 bg-destructive/5',
              )}
            >
              {previewResult.ok ? (
                <>
                  {previewResult.goal_summary ? (
                    <p className="text-xs text-muted-foreground">执行计划：{previewResult.goal_summary}</p>
                  ) : null}
                  <p className="mt-1 font-semibold text-foreground">
                    {previewResult.title || '未知书名'}
                    {previewResult.author ? (
                      <span className="font-normal text-muted-foreground"> · {previewResult.author}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    预计抓取约 {previewResult.chapter_count ?? 0} 章
                  </p>
                  {previewResult.sample_chapters && previewResult.sample_chapters.length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      {previewResult.sample_chapters.map((chapter, index) => (
                        <li key={`${chapter.url}-${index}`} className="truncate">
                          {index + 1}. {chapter.title}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
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
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : jobs!.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无爬虫任务</p>
        ) : (
          <div className="space-y-3">
            {jobs!.map((job) => {
              const percent = progressPercent(job)
              const jobGoal = parseCrawlJobGoal(job.configJson)
              return (
                <div
                  key={job.id}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between',
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
                          'rounded-full px-2 py-0.5 text-xs',
                          job.status === 'RUNNING'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-foreground/80',
                        )}
                      >
                        {statusLabel(job.status)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{job.sourceUrl}</p>
                    {jobGoal ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">目标：{jobGoal}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      进度 {job.chaptersDone ?? 0}/{job.chaptersTotal ?? '?'}
                      {job.catalogNovelId ? ` · 书库 ID ${job.catalogNovelId}` : ''}
                    </p>
                    {percent != null ? (
                      <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    ) : job.status === 'RUNNING' ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                        <Loader2 className="size-3.5 animate-spin" />
                        AI 代理执行中…
                      </div>
                    ) : null}
                    {job.errorMessage ? (
                      <p className="mt-1 text-xs text-destructive">{job.errorMessage}</p>
                    ) : null}
                    <CrawlLogTerminal
                      jobId={job.id}
                      jobStatus={job.status}
                      defaultOpen={job.status === 'RUNNING'}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={actingId === job.id} onClick={() => void runAction(job.id, 'start')}>
                      <Play className="mr-1 size-3.5" />启动
                    </Button>
                    <Button size="sm" variant="outline" disabled={actingId === job.id} onClick={() => void runAction(job.id, 'pause')}>
                      <Pause className="mr-1 size-3.5" />暂停
                    </Button>
                    <Button size="sm" variant="outline" disabled={actingId === job.id} onClick={() => void runAction(job.id, 'cancel')}>
                      <Square className="mr-1 size-3.5" />取消
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
