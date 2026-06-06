import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchNovels, type DashboardNovel } from '@/api/dashboardApi'

function formatDate(ts: number): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function NovelsPage() {
  const [novels, setNovels] = useState<DashboardNovel[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchNovels()
      .then((list) => {
        if (!cancelled) {
          setNovels(list)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNovels([])
          setError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loading = novels === null

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-br from-primary/[0.04] via-surface to-violet-500/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">作品库</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {loading ? '加载中…' : `共 ${novels!.length} 部作品`}
            </p>
          </div>
        </div>
        <Button
          asChild
          className="rounded-xl px-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <Link to="/editor">
            <Plus className="mr-2 size-4" />
            新建小说
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
            >
              <Skeleton className="mb-4 size-12 rounded-xl" />
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-6 h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : novels!.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface px-6 py-24 text-center shadow-sm">
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-9 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {error ? '加载失败' : '开始你的创作之旅'}
          </h3>
          <p className="mt-2 max-w-md text-base text-muted-foreground">
            {error
              ? '暂时无法加载小说列表，请稍后重试'
              : '创建一个新的小说项目，让 AI 助手帮你构建世界观、大纲和章节。'}
          </p>
          <Button
            asChild
            className="mt-8 rounded-xl px-8 py-6 text-base shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Link to="/editor">
              <Plus className="mr-2 size-5" />
              创建第一部作品
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {novels!.map((novel, index) => (
            <article
              key={novel.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-hover"
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-indigo-400 opacity-80"
                style={{ opacity: 0.35 + (index % 3) * 0.15 }}
              />
              <div className="flex flex-1 flex-col p-5 pt-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-primary/10">
                  <BookOpen className="size-6" />
                </div>

                <h3
                  className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-foreground"
                  title={novel.title}
                >
                  {novel.title}
                </h3>

                {novel.genre ? (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {novel.genre}
                  </span>
                ) : null}

                <div className="mt-auto flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1.5 size-3.5 shrink-0" />
                  更新于 {formatDate(novel.updatedAt)}
                </div>
              </div>

              <div className="border-t border-border/80 p-4 pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 w-full rounded-xl border-border/80 transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  <Link to="/editor">继续写作</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
