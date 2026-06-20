import { useEffect, useMemo, useState } from 'react'
import i18n from '@/i18n'
import {
  fetchActivity,
  fetchRecentNovels,
  fetchSummary,
  type DashboardActivity,
  type DashboardSummary,
  type RecentNovel,
} from '@/api/dashboardApi'
import { fetchUsageTrends, type UsageTrendPoint } from '@/api/billingApi'
import { dashboardCache } from '@/stores/dashboardCacheStore'
import { EDITOR_CREATE_HREF, editorNovelHref } from '@/lib/editorRoutes'
import { buildDashboardKpis, formatCompactMetric } from '@/utils/dashboardMetrics'
import { useTranslation } from 'react-i18next'

export interface DashboardKpiCardView {
  key: 'yesterday' | 'month' | 'total'
  label: string
  value: string
}

/**
 * Shared data hook for the dashboard home page (desktop + mobile).
 *
 * Owns summary / recentNovels / activity / tokenTrends state, cache reads &
 * writes, error fallbacks, KPI derivation, and editor entry href — identical
 * behavior to the original monolithic DashboardHomePage. Both views consume
 * the return value; nothing here is view-specific.
 */
export function useDashboardHome() {
  const { t } = useTranslation(['common', 'dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'

  const [summary, setSummary] = useState<DashboardSummary | null>(() => dashboardCache.getSummary())
  const [recentNovels, setRecentNovels] = useState<RecentNovel[] | null>(() =>
    dashboardCache.getRecentNovels(),
  )
  const [activity, setActivity] = useState<DashboardActivity | null>(() =>
    dashboardCache.getActivity(),
  )
  const [tokenTrends, setTokenTrends] = useState<UsageTrendPoint[] | null>(() =>
    dashboardCache.getTokenTrends(),
  )
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

  useEffect(() => {
    let cancelled = false
    void fetchUsageTrends(30)
      .then((trends) => {
        if (cancelled) return
        dashboardCache.setTokenTrends(trends)
        setTokenTrends(trends)
      })
      .catch(() => {
        if (!cancelled) {
          setTokenTrends([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loading = summary === null || recentNovels === null
  const activityLoading = activity === null
  const tokenLoading = tokenTrends === null
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
      key: 'yesterday' as const,
      label: t('dashboard:home.kpiYesterday'),
      value: formatCompactMetric(kpis.yesterday, dateLocale),
    },
    {
      key: 'month' as const,
      label: t('dashboard:home.kpiMonth'),
      value: formatCompactMetric(kpis.monthToDate, dateLocale),
    },
    {
      key: 'total' as const,
      label: t('dashboard:home.kpiTotal'),
      value: formatCompactMetric(kpis.total, dateLocale),
    },
  ] satisfies DashboardKpiCardView[]

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

  return {
    t,
    dateLocale,
    summary,
    recentNovels,
    activity,
    tokenTrends,
    loadError,
    loading,
    activityLoading,
    tokenLoading,
    primaryNovelId,
    editorEntryHref,
    kpis,
    topKpiCards,
    formatUpdatedAt,
  }
}
