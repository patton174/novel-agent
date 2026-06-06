import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CreditCard,
  FileText,
  PenLine,
} from 'lucide-react'
import {
  fetchActivity,
  fetchRecentNovels,
  fetchSummary,
  type DashboardActivity,
  type DashboardSummary,
  type RecentNovel,
} from '@/api/dashboardApi'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
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
  {
    key: 'novelCount' as const,
    label: '小说数量',
    icon: BookOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
  },
  {
    key: 'chapterCount' as const,
    label: '章节总数',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
  },
  {
    key: 'weeklyWordCount' as const,
    label: '本周字数',
    icon: PenLine,
    format: formatWordCount,
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
  },
  {
    key: 'agentRunCount' as const,
    label: 'Agent 运行',
    icon: Bot,
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
  },
]

export default function DashboardHomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentNovels, setRecentNovels] = useState<RecentNovel[] | null>(null)
  const [activity, setActivity] = useState<DashboardActivity | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)

    void Promise.all([fetchSummary(), fetchRecentNovels(), fetchActivity()])
      .then(([s, novels, act]) => {
        if (cancelled) return
        setSummary(s)
        setRecentNovels(novels)
        setActivity(act)
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
          setActivity({ days: [], totalWritingWords: 0, totalAgentRuns: 0 })
          setLoadError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loading = summary === null || recentNovels === null
  const activityLoading = activity === null

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key} size="sm" className="py-0 shadow-none">
            <CardContent className="flex items-center gap-3 px-4 py-3.5">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
              >
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums leading-none text-foreground">
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-14" />
                  ) : stat.format ? (
                    stat.format(summary![stat.key])
                  ) : (
                    summary![stat.key].toLocaleString('zh-CN')
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ActivityHeatmap activity={activity} loading={activityLoading} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)] lg:items-start">
        <Card className="flex flex-col py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="text-sm font-semibold">最近编辑</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-primary">
                <Link to="/dashboard/novels">
                  查看全部
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : recentNovels!.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="size-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {loadError ? '加载失败' : '还没有开始创作'}
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  {loadError
                    ? '暂时无法加载数据，请稍后重试'
                    : '创建一个新的小说项目，让 AI 助手帮你构建世界观和章节。'}
                </p>
                <Button asChild className="mt-5 rounded-xl px-6">
                  <Link to="/editor">新建小说</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentNovels!.map((novel) => (
                  <div
                    key={novel.novelId}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {novel.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        最近编辑 {formatUpdatedAt(novel.updatedAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0 rounded-lg">
                      <Link
                        to={
                          novel.lastChapterId ? `/editor/${novel.lastChapterId}` : '/editor'
                        }
                      >
                        继续写作
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="text-sm font-semibold">用量与账单</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 px-5 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-3.5 shrink-0" />
                  本月 Tokens
                </span>
                <span className="font-medium tabular-nums text-foreground">124,592 / 1M</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: '12.4%' }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="size-3.5 shrink-0" />
                API 调用
              </span>
              <span className="font-medium tabular-nums text-foreground">3,402 次</span>
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="size-3.5 shrink-0" />
                  预估费用
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">¥12.45</span>
              </div>
              <Button className="h-9 w-full rounded-lg text-sm" variant="outline">
                查看详细账单
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
