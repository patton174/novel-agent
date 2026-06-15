import type { DashboardActivity, DashboardActivityDay, DashboardSummary } from '@/api/dashboardApi'

export type DashboardTrendRange = 7 | 30

/** 图表 Y 轴：更短标签，避免 36px 宽度下「1.28万」被裁成「.28万」 */
export function formatChartAxisMetric(value: number, locale: string): string {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (locale.startsWith('zh')) {
    if (n >= 10_000) {
      const wan = n / 10_000
      return wan >= 10 ? `${wan.toFixed(0)}万` : `${wan.toFixed(1)}万`
    }
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}千`
    return String(n)
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatCompactMetric(value: number, locale: string): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2)}亿`
  }
  if (locale.startsWith('zh') && value >= 10_000) {
    return `${(value / 10_000).toFixed(value >= 100_000 ? 1 : 2)}万`
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 10_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toLocaleString(locale)
}

function parseUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function dayActivityScore(day: DashboardActivityDay): number {
  return day.writingWords + day.agentRuns * 800
}

export function yesterdayActivityScore(days: DashboardActivityDay[]): number {
  if (days.length === 0) return 0
  const last = days[days.length - 1]
  return dayActivityScore(last)
}

export function monthToDateActivityScore(days: DashboardActivityDay[]): number {
  if (days.length === 0) return 0
  const now = new Date()
  const month = now.getUTCMonth()
  const year = now.getUTCFullYear()
  return days
    .filter((day) => {
      const d = parseUtcDate(day.date)
      return d.getUTCFullYear() === year && d.getUTCMonth() === month
    })
    .reduce((sum, day) => sum + dayActivityScore(day), 0)
}

export function totalActivityScore(activity: DashboardActivity | null): number {
  if (!activity) return 0
  return activity.totalWritingWords + activity.totalAgentRuns * 800
}

export interface DashboardKpiSnapshot {
  yesterday: number
  monthToDate: number
  total: number
  weeklyWords: number
  agentRuns: number
  novelCount: number
  chapterCount: number
}

export function buildDashboardKpis(
  summary: DashboardSummary | null,
  activity: DashboardActivity | null,
): DashboardKpiSnapshot {
  const days = activity?.days ?? []
  return {
    yesterday: yesterdayActivityScore(days),
    monthToDate: monthToDateActivityScore(days),
    total: totalActivityScore(activity),
    weeklyWords: summary?.weeklyWordCount ?? 0,
    agentRuns: summary?.agentRunCount ?? 0,
    novelCount: summary?.novelCount ?? 0,
    chapterCount: summary?.chapterCount ?? 0,
  }
}

export interface DashboardTrendPoint {
  date: string
  value: number
  writingWords: number
  agentRuns: number
}

export function buildTrendSeries(
  days: DashboardActivityDay[],
  range: DashboardTrendRange,
): DashboardTrendPoint[] {
  const slice = days.slice(-range)
  return slice.map((day) => ({
    date: day.date,
    value: dayActivityScore(day),
    writingWords: day.writingWords,
    agentRuns: day.agentRuns,
  }))
}

export function peakDailyActivity(days: DashboardActivityDay[]): number {
  if (days.length === 0) return 0
  return Math.max(...days.map((day) => dayActivityScore(day)), 0)
}

export function activeDayCount(days: DashboardActivityDay[]): number {
  return days.filter((day) => dayActivityScore(day) > 0).length
}

export function activityAsOfLabel(days: DashboardActivityDay[], locale: string): string {
  if (days.length === 0) return '—'
  const last = days[days.length - 1]?.date
  if (!last) return '—'
  return parseUtcDate(last).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
