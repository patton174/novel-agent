import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Bot,
  FileText,
  PenLine,
  Sparkles,
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
import { APP_BTN, APP_BTN_MD } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
  AppStatCard,
} from '@/components/layout/AppPageStack'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { dashboardCache } from '@/stores/dashboardCacheStore'

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
  useMarkRouteSeen()
  const [summary, setSummary] = useState<DashboardSummary | null>(() => dashboardCache.getSummary())
  const [recentNovels, setRecentNovels] = useState<RecentNovel[] | null>(() =>
    dashboardCache.getRecentNovels(),
  )
  const [activity, setActivity] = useState<DashboardActivity | null>(() => dashboardCache.getActivity())
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)

    void Promise.all([fetchSummary(), fetchRecentNovels(), fetchActivity()])
      .then(([s, novels, act]) => {
        if (cancelled) return
        dashboardCache.setSummary(s)
        dashboardCache.setRecentNovels(novels)
        dashboardCache.setActivity(act)
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
    <AppPageStack>
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-surface via-surface to-indigo-50/60 p-6 shadow-[0_20px_60px_-24px_rgba(79,70,229,0.25)] md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              <Sparkles className="size-3.5" />
              创作工作台
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">
              继续你的故事
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              概览创作数据、打开最近章节，或直接进入编辑器开始新段落。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button asChild variant="outline" className={APP_BTN_MD}>
              <Link to="/dashboard/novels">管理作品</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <AppStatCard
            key={stat.key}
            label={stat.label}
            icon={stat.icon}
            iconClassName={stat.color}
            iconBgClassName={stat.bg}
            loading={loading}
            value={
              loading
                ? '—'
                : stat.format
                  ? stat.format(summary![stat.key])
                  : summary![stat.key].toLocaleString('zh-CN')
            }
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <AppShellCard>
          <AppShellCardBody className="p-0">
            <ActivityHeatmap activity={activity} loading={activityLoading} />
          </AppShellCardBody>
        </AppShellCard>

        <AppShellCard className="flex flex-col">
          <AppShellCardHeader
            title="最近编辑"
            action={
              <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-primary">
                <Link to="/dashboard/novels">
                  查看全部
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
          <AppShellCardBody className="flex flex-1 flex-col p-0">
            {loading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : recentNovels!.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
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
                <Button asChild className={`mt-5 px-6 ${APP_BTN_MD}`}>
                  <Link to="/editor">新建小说</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentNovels!.map((novel) => (
                  <div
                    key={novel.novelId}
                    className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-surface-hover"
                  >
                    {novel.coverUrl ? (
                      <img
                        src={novel.coverUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-md object-cover ring-1 ring-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border">
                        <BookOpen className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {novel.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        最近编辑 {formatUpdatedAt(novel.updatedAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" className={`shrink-0 px-3 ${APP_BTN}`}>
                      <Link
                        to={`/editor?novelId=${encodeURIComponent(novel.novelId)}`}
                      >
                        继续写作
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AppShellCardBody>
        </AppShellCard>
      </div>
    </AppPageStack>
  )
}
