import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Bot, FileText, PenLine } from 'lucide-react'
import {
  fetchRecentNovels,
  fetchSummary,
  type DashboardSummary,
  type RecentNovel,
} from '@/api/dashboardApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function formatUpdatedAt(value: string | number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)} 万`
  }
  return count.toLocaleString('zh-CN')
}

const STAT_CARDS = [
  { key: 'novelCount' as const, label: '小说数量', icon: BookOpen },
  { key: 'chapterCount' as const, label: '章节总数', icon: FileText },
  { key: 'weeklyWordCount' as const, label: '本周字数', icon: PenLine, format: formatWordCount },
  { key: 'agentRunCount' as const, label: 'Agent 运行', icon: Bot },
]

export default function DashboardHomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentNovels, setRecentNovels] = useState<RecentNovel[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)

    void Promise.all([fetchSummary(), fetchRecentNovels()])
      .then(([s, novels]) => {
        if (cancelled) {
          return
        }
        setSummary(s)
        setRecentNovels(novels)
      })
      .catch(() => {
        if (!cancelled) {
          setSummary({
            novelCount: 0,
            chapterCount: 0,
            weeklyWordCount: 0,
            agentRunCount: 0,
          })
          setRecentNovels([])
          setLoadError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loading = summary === null || recentNovels === null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key} size="sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl tabular-nums">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  (stat.format
                    ? stat.format(summary![stat.key])
                    : summary![stat.key].toLocaleString('zh-CN'))
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近编辑</CardTitle>
          <CardDescription>继续你未完成的创作</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))
          ) : recentNovels!.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
              <BookOpen className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {loadError ? '暂时无法加载数据，请稍后重试' : '还没有小说，去编辑器开始创作吧'}
              </p>
              <Button asChild size="sm">
                <Link to="/editor">进入编辑器</Link>
              </Button>
            </div>
          ) : (
            recentNovels!.map((novel) => (
              <div
                key={novel.novelId}
                className="flex items-center gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <BookOpen className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{novel.title}</p>
                  <p className="text-xs text-muted-foreground">
                    最近编辑 {formatUpdatedAt(novel.updatedAt)}
                  </p>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  小说
                </Badge>
                <Button asChild size="sm" variant="outline">
                  <Link
                    to={
                      novel.lastChapterId
                        ? `/editor/${novel.lastChapterId}`
                        : '/editor'
                    }
                  >
                    继续写作
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
