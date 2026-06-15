import { describe, expect, it } from 'vitest'
import {
  buildDashboardKpis,
  buildTrendSeries,
  formatCompactMetric,
  monthToDateActivityScore,
  yesterdayActivityScore,
} from './dashboardMetrics'
import type { DashboardActivityDay } from '@/api/dashboardApi'

const sampleDays: DashboardActivityDay[] = [
  { date: '2026-06-10', writingWords: 1000, agentRuns: 1 },
  { date: '2026-06-11', writingWords: 2000, agentRuns: 0 },
  { date: '2026-06-12', writingWords: 500, agentRuns: 2 },
]

describe('dashboardMetrics', () => {
  it('formats compact metrics for zh locale', () => {
    expect(formatCompactMetric(12_340, 'zh-CN')).toBe('1.23万')
    expect(formatCompactMetric(1_500_000, 'en-US')).toBe('1.50M')
  })

  it('builds kpis from summary and activity', () => {
    const kpis = buildDashboardKpis(
      { novelCount: 2, chapterCount: 10, weeklyWordCount: 3500, agentRunCount: 4 },
      { days: sampleDays, totalWritingWords: 3500, totalAgentRuns: 3 },
    )
    expect(kpis.novelCount).toBe(2)
    expect(kpis.weeklyWords).toBe(3500)
    expect(kpis.yesterday).toBe(yesterdayActivityScore(sampleDays))
    expect(kpis.monthToDate).toBe(monthToDateActivityScore(sampleDays))
  })

  it('builds trend series for selected range', () => {
    expect(buildTrendSeries(sampleDays, 7)).toHaveLength(3)
    expect(buildTrendSeries(sampleDays, 7)[0]?.date).toBe('2026-06-10')
  })
})
