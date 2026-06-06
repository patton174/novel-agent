import { useCallback, useEffect, useState } from 'react'
import { Bot, Loader2, Pause, Play, Plus, RefreshCw, Square, Wand2 } from 'lucide-react'
import {
  cancelCrawlJob,
  createCrawlJob,
  fetchCrawlJobs,
  pauseCrawlJob,
  previewCrawl,
  startCrawlJob,
  type CrawlJob,
} from '@/api/crawlAdminApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'

const DEFAULT_CONFIG = `{
  "maxChapters": 200,
  "useStealth": false
}`

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

export default function CrawlerPage() {
  const [jobs, setJobs] = useState<CrawlJob[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [configJson, setConfigJson] = useState(DEFAULT_CONFIG)

  const load = useCallback(async () => {
    setLoading(true)
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
    const timer = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(timer)
  }, [load])

  const handlePreview = async () => {
    if (!sourceUrl.trim()) {
      appToast.error('请输入小说目录页 URL')
      return
    }
    setPreviewing(true)
    try {
      const result = await previewCrawl({ sourceUrl: sourceUrl.trim() })
      if (result.ok) {
        appToast.success(
          `AI 识别：${result.title || '未知'}${result.author ? ` · ${result.author}` : ''}，约 ${result.chapter_count ?? 0} 章`,
        )
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
      appToast.error('请输入小说目录页 URL')
      return
    }
    setActingId('create')
    try {
      const job = await createCrawlJob({
        sourceUrl: sourceUrl.trim(),
        configJson,
      })
      await startCrawlJob(job.id)
      appToast.success('AI 爬虫已启动，完成后可在用户端「书库」浏览')
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
            Scrapling 抓取 + LLM 自动解析目录与正文，入库公共书库；用户自行浏览添加
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
          <h2 className="text-lg font-semibold">新建爬取任务</h2>
        </div>
        <div className="space-y-3">
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="小说目录页 URL（AI 自动识别章节，无需配置选择器）"
          />
          <details className="rounded-lg border border-border/80 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              高级选项（可选）
            </summary>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              仅需 maxChapters / useStealth；无需 CSS 选择器
            </p>
          </details>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={previewing} onClick={() => void handlePreview()}>
              {previewing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
              AI 预览
            </Button>
            <Button type="button" disabled={actingId === 'create'} onClick={() => void handleCreate()}>
              {actingId === 'create' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              创建并启动
            </Button>
          </div>
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
            {jobs!.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-xl border border-border/80 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{job.title || '解析中…'}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{statusLabel(job.status)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{job.sourceUrl}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    进度 {job.chaptersDone ?? 0}/{job.chaptersTotal ?? '?'}
                    {job.catalogNovelId ? ` · 书库 ID ${job.catalogNovelId}` : ''}
                  </p>
                  {job.errorMessage ? <p className="mt-1 text-xs text-destructive">{job.errorMessage}</p> : null}
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
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
