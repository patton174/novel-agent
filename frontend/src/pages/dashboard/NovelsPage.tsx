import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus, MoreVertical, Clock } from 'lucide-react'
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">我的小说</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '加载中…' : `共 ${novels!.length} 部作品`}
          </p>
        </div>
        <Button asChild className="rounded-xl px-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <Link to="/editor">
            <Plus className="w-4 h-4 mr-2" />
            新建小说
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : novels!.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-border flex flex-col items-center justify-center py-24 px-4 text-center shadow-sm">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {error ? '加载失败' : '开始你的创作之旅'}
          </h3>
          <p className="text-base text-muted-foreground mb-8 max-w-md">
            {error ? '暂时无法加载小说列表，请稍后重试' : '创建一个新的小说项目，让 AI 助手帮你构建世界观、大纲和章节。'}
          </p>
          <Button asChild className="rounded-xl px-8 py-6 text-base shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
            <Link to="/editor">
              <Plus className="w-5 h-5 mr-2" />
              创建第一部作品
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {novels!.map((novel) => (
            <div 
              key={novel.id}
              className="group bg-white rounded-2xl border border-border p-5 shadow-soft hover:shadow-hover hover:border-primary/30 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <button className="text-muted-foreground hover:text-foreground p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 mb-6">
                <h3 className="text-lg font-bold text-foreground line-clamp-1 mb-2" title={novel.title}>
                  {novel.title}
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    更新于 {formatDate(novel.updatedAt)}
                  </div>
                </div>
              </div>

              <Button asChild variant="outline" className="w-full rounded-xl group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                <Link to="/editor">继续写作</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
