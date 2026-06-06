import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Bot, FileText, PenLine, Activity, CreditCard, BarChart3 } from 'lucide-react'
import {
  fetchRecentNovels,
  fetchSummary,
  type DashboardSummary,
  type RecentNovel,
} from '@/api/dashboardApi'
import { Button } from '@/components/ui/button'
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
  { key: 'novelCount' as const, label: '小说数量', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'chapterCount' as const, label: '章节总数', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { key: 'weeklyWordCount' as const, label: '本周字数', icon: PenLine, format: formatWordCount, color: 'text-violet-500', bg: 'bg-violet-50' },
  { key: 'agentRunCount' as const, label: 'Agent 运行', icon: Bot, color: 'text-amber-500', bg: 'bg-amber-50' },
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
        if (cancelled) return
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">概览</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <div key={stat.key} className="bg-white rounded-2xl p-6 border border-border shadow-soft hover:shadow-hover transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stat.format
                  ? stat.format(summary![stat.key])
                  : summary![stat.key].toLocaleString('zh-CN')
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Novels */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">最近编辑</h2>
            <Link to="/dashboard/novels" className="text-sm font-medium text-primary hover:underline">
              查看全部
            </Link>
          </div>
          
          <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
            <div className="p-2 space-y-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-24 rounded-lg" />
                  </div>
                ))
              ) : recentNovels!.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {loadError ? '加载失败' : '还没有开始创作'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    {loadError ? '暂时无法加载数据，请稍后重试' : '创建一个新的小说项目，让 AI 助手帮你构建世界观和章节。'}
                  </p>
                  <Button asChild className="rounded-xl px-6">
                    <Link to="/editor">新建小说</Link>
                  </Button>
                </div>
              ) : (
                recentNovels!.map((novel) => (
                  <div
                    key={novel.novelId}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-surface-hover transition-colors group"
                  >
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground truncate mb-1">
                        {novel.title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>最近编辑 {formatUpdatedAt(novel.updatedAt)}</span>
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
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
            </div>
          </div>
        </div>

        {/* Usage & Billing Summary */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">用量与账单</h2>
          
          <div className="bg-white rounded-2xl border border-border shadow-soft p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  本月 Tokens
                </span>
                <span className="font-semibold text-foreground">124,592 / 1M</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '12.4%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  API 调用
                </span>
                <span className="font-semibold text-foreground">3,402 次</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  预估费用
                </span>
                <span className="text-2xl font-bold text-foreground">¥12.45</span>
              </div>
              <Button className="w-full rounded-xl" variant="outline">
                查看详细账单
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
