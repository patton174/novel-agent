import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, PenLine } from 'lucide-react'
import {
  fetchActivity,
  fetchRecentNovels,
  fetchSummary,
  type DashboardActivity,
  type DashboardSummary,
  type RecentNovel,
} from '@/api/dashboardApi'
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap'
import { DashboardActivityTrendChart } from '@/components/dashboard/DashboardActivityTrendChart'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
import { Button } from '@/components/ui/button'
import { APP_BTN, APP_BTN_MD } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'
import { AppPageStack, AppShellCard } from '@/components/layout/AppPageStack'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { dashboardCache } from '@/stores/dashboardCacheStore'
import { EDITOR_CREATE_HREF, editorNovelHref } from '@/lib/editorRoutes'
import { buildDashboardKpis, formatCompactMetric } from '@/utils/dashboardMetrics'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

export default function DashboardHomePage() {
  const { t } = useTranslation(['common', 'dashboard'])
  useMarkRouteSeen()

  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'

  function formatUpdatedAt(value: string | number): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return '—'
    }
    return date.toLocaleString(dateLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
  const primaryNovelId = recentNovels?.[0]?.novelId
  const editorEntryHref = primaryNovelId
    ? editorNovelHref(primaryNovelId)
    : EDITOR_CREATE_HREF

  const kpis = useMemo(
    () => buildDashboardKpis(summary, activity),
    [summary, activity],
  )

  const topKpiCards = [
    {
      key: 'yesterday',
      label: t('dashboard:home.kpiYesterday'),
      value: formatCompactMetric(kpis.yesterday, dateLocale),
    },
    {
      key: 'month',
      label: t('dashboard:home.kpiMonth'),
      value: formatCompactMetric(kpis.monthToDate, dateLocale),
    },
    {
      key: 'total',
      label: t('dashboard:home.kpiTotal'),
      value: formatCompactMetric(kpis.total, dateLocale),
    },
  ] as const

  return (
    <AppPageStack className="gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {t('dashboard:home.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard:home.desc')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild className={APP_BTN_MD}>
            <Link to={editorEntryHref}>
              <PenLine className="mr-2 size-4" />
              {primaryNovelId ? t('dashboard:home.continueWriting') : t('dashboard:home.enterEditor')}
            </Link>
          </Button>
          <Button asChild variant="outline" className={APP_BTN_MD}>
            <Link to="/dashboard/novels">{t('dashboard:home.manageNovels')}</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {topKpiCards.map((card) => (
          <DashboardKpiCard
            key={card.key}
            label={card.label}
            value={card.value}
            loading={loading || activityLoading}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <AppShellCard className="flex min-h-[320px] flex-col">
          <DashboardActivityTrendChart
            days={activity?.days ?? []}
            loading={activityLoading}
          />
        </AppShellCard>

        <AppShellCard className="flex min-h-[320px] flex-col">
          <ActivityHeatmap activity={activity} loading={activityLoading} />
        </AppShellCard>
      </div>

      <AppShellCard>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {t('dashboard:home.recentEdits')}
          </h2>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-primary">
            <Link to="/dashboard/novels">
              {t('dashboard:home.viewAll')}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

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
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
              <BookOpen className="size-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {loadError ? t('dashboard:home.loadFail') : t('dashboard:home.noNovels')}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {loadError
                ? t('dashboard:home.loadFailDesc')
                : t('dashboard:home.noNovelsDesc')}
            </p>
            <Button asChild className={`mt-5 px-6 ${APP_BTN_MD}`}>
              <Link to={EDITOR_CREATE_HREF}>{t('dashboard:home.createNovel')}</Link>
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
                  <p className="truncate text-sm font-semibold text-foreground">{novel.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('dashboard:home.recentlyEdited', { time: formatUpdatedAt(novel.updatedAt) })}
                  </p>
                </div>
                <Button asChild size="sm" className={`shrink-0 px-3 ${APP_BTN}`}>
                  <Link to={editorNovelHref(novel.novelId)}>
                    {t('dashboard:home.continueWriting')}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </AppShellCard>
    </AppPageStack>
  )
}
