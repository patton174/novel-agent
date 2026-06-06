import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { DashboardActivity, DashboardActivityDay } from '@/api/dashboardApi'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export type ActivityMode = 'all' | 'writing' | 'agent'

const MODE_OPTIONS: { id: ActivityMode; label: string; metricLabel: string }[] = [
  { id: 'all', label: '全部', metricLabel: '创作活跃' },
  { id: 'writing', label: '写作', metricLabel: '写作字数' },
  { id: 'agent', label: 'Agent', metricLabel: 'Agent 运行' },
]

const LEVEL_CLASSES = [
  'bg-muted',
  'bg-emerald-200 dark:bg-emerald-900/50',
  'bg-emerald-400 dark:bg-emerald-700',
  'bg-emerald-600 dark:bg-emerald-600',
  'bg-emerald-800 dark:bg-emerald-500',
]

/** 与 Tailwind size-3 / gap-[3px] 保持一致，月份标签才能对齐列 */
const WEEKDAY_LABELS = [
  { row: 1, label: '一' },
  { row: 3, label: '三' },
  { row: 5, label: '五' },
]

interface HeatCell {
  date: string | null
  value: number
}

function parseUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function formatIsoUtc(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDayValue(day: DashboardActivityDay, mode: ActivityMode): number {
  switch (mode) {
    case 'writing':
      return day.writingWords
    case 'agent':
      return day.agentRuns
    case 'all':
      return day.writingWords + day.agentRuns * 800
  }
}

function valueToLevel(value: number, max: number): number {
  if (value <= 0) return 0
  if (max <= 0) return 1
  const ratio = value / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

function buildHeatmapGrid(days: DashboardActivityDay[], mode: ActivityMode) {
  if (days.length === 0) {
    return { weeks: [] as HeatCell[][], maxValue: 0, monthLabels: [] as { weekIndex: number; label: string }[] }
  }

  const valueByDate = new Map(days.map((d) => [d.date, getDayValue(d, mode)]))
  const firstDay = parseUtcDate(days[0].date)
  const lastDay = parseUtcDate(days[days.length - 1].date)

  const gridStart = new Date(firstDay)
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay())

  const gridEnd = new Date(lastDay)
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()))

  const weeks: HeatCell[][] = []
  const monthLabels: { weekIndex: number; label: string }[] = []
  let lastMonth = -1
  const cursor = new Date(gridStart)
  let weekIndex = 0

  while (cursor <= gridEnd) {
    const weekStart = new Date(cursor)
    const week: HeatCell[] = []

    for (let dow = 0; dow < 7; dow++) {
      const iso = formatIsoUtc(cursor)
      const inRange = cursor >= firstDay && cursor <= lastDay
      week.push({
        date: inRange ? iso : null,
        value: inRange ? (valueByDate.get(iso) ?? 0) : 0,
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    const month = weekStart.getUTCMonth()
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex, label: String(month + 1) })
      lastMonth = month
    }

    weeks.push(week)
    weekIndex++
  }

  const maxValue = Math.max(...days.map((d) => getDayValue(d, mode)), 1)
  return { weeks, maxValue, monthLabels }
}

function computeStreaks(days: DashboardActivityDay[], mode: ActivityMode) {
  let longest = 0
  let current = 0
  let run = 0

  for (const day of days) {
    if (getDayValue(day, mode) > 0) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }

  for (let i = days.length - 1; i >= 0; i--) {
    if (getDayValue(days[i], mode) > 0) {
      current += 1
    } else {
      break
    }
  }

  return { longest, current }
}

function computeHighlights(days: DashboardActivityDay[], mode: ActivityMode) {
  const monthTotals = new Map<number, number>()
  let bestDay = days[0]?.date ?? '—'
  let bestValue = -1

  for (const day of days) {
    const value = getDayValue(day, mode)
    const month = parseUtcDate(day.date).getUTCMonth()
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + value)
    if (value > bestValue) {
      bestValue = value
      bestDay = day.date
    }
  }

  let bestMonth = 0
  let bestMonthValue = -1
  monthTotals.forEach((total, month) => {
    if (total > bestMonthValue) {
      bestMonthValue = total
      bestMonth = month
    }
  })

  const bestDayLabel =
    bestValue > 0
      ? parseUtcDate(bestDay).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : '—'

  const bestMonthLabel = bestMonthValue > 0 ? `${bestMonth + 1} 月` : '—'

  return { bestMonthLabel, bestDayLabel }
}

function formatTotal(activity: DashboardActivity, mode: ActivityMode): string {
  switch (mode) {
    case 'writing':
      return activity.totalWritingWords.toLocaleString('zh-CN')
    case 'agent':
      return activity.totalAgentRuns.toLocaleString('zh-CN')
    case 'all':
      return (activity.totalWritingWords + activity.totalAgentRuns * 800).toLocaleString('zh-CN')
  }
}

function formatTooltip(date: string, value: number, mode: ActivityMode): string {
  const label = parseUtcDate(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  if (value <= 0) return `${label}：无活动`
  if (mode === 'agent') return `${label}：${value} 次 Agent 运行`
  if (mode === 'writing') return `${label}：${value.toLocaleString('zh-CN')} 字`
  return `${label}：活跃值 ${value.toLocaleString('zh-CN')}`
}

interface ActivityHeatmapProps {
  activity: DashboardActivity | null
  loading?: boolean
}

export function ActivityHeatmap({ activity, loading }: ActivityHeatmapProps) {
  const [mode, setMode] = useState<ActivityMode>('all')
  const days = activity?.days ?? []

  const { weeks, maxValue, monthLabels } = useMemo(
    () => buildHeatmapGrid(days, mode),
    [days, mode],
  )

  const streaks = useMemo(() => computeStreaks(days, mode), [days, mode])
  const highlights = useMemo(() => computeHighlights(days, mode), [days, mode])
  const activeMode = MODE_OPTIONS.find((m) => m.id === mode)!

  const monthLabelByWeek = useMemo(
    () => new Map(monthLabels.map((m) => [m.weekIndex, m.label])),
    [monthLabels],
  )

  return (
    <Card className="py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{activeMode.metricLabel}</p>
            {loading ? (
              <Skeleton className="mt-1.5 h-8 w-28" />
            ) : (
              <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {activity ? formatTotal(activity, mode) : '0'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 rounded-lg bg-muted p-0.5">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  mode === option.id
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-4">
        {loading ? (
          <Skeleton className="h-[108px] w-full max-w-2xl rounded-lg" />
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex min-w-0 flex-col gap-1.5">
              {/* 月份行 — 与下方周列同宽同间距 */}
              <div className="flex gap-[3px] pl-[18px]">
                {weeks.map((_, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="w-3 shrink-0 text-[10px] leading-none text-muted-foreground"
                  >
                    {monthLabelByWeek.get(weekIndex) ?? ''}
                  </div>
                ))}
              </div>

              <div className="flex gap-[3px]">
                {/* 星期标签 — 与格子行对齐 */}
                <div className="flex w-[15px] shrink-0 flex-col gap-[3px] pt-[1px]">
                  {Array.from({ length: 7 }).map((_, rowIndex) => {
                    const label = WEEKDAY_LABELS.find((l) => l.row === rowIndex)
                    return (
                      <div
                        key={rowIndex}
                        className="flex h-3 items-center text-[10px] leading-none text-muted-foreground"
                      >
                        {label?.label ?? ''}
                      </div>
                    )
                  })}
                </div>

                {/* 热力格子 */}
                <div className="flex gap-[3px]">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                      {week.map((cell, rowIndex) => {
                        const level = cell.date ? valueToLevel(cell.value, maxValue) : 0
                        return (
                          <div
                            key={`${weekIndex}-${rowIndex}`}
                            title={
                              cell.date
                                ? formatTooltip(cell.date, cell.value, mode)
                                : undefined
                            }
                            className={cn(
                              'size-3 shrink-0 rounded-[2px]',
                              cell.date ? LEVEL_CLASSES[level] : 'bg-transparent',
                            )}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-muted-foreground">最活跃月份</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {loading ? '—' : highlights.bestMonthLabel}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">最活跃日期</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {loading ? '—' : highlights.bestDayLabel}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">最长连续</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {loading ? '—' : `${streaks.longest} 天`}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">当前连续</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {loading ? '—' : `${streaks.current} 天`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>少</span>
            {LEVEL_CLASSES.map((cls, i) => (
              <div key={i} className={cn('size-3 rounded-[2px]', cls)} />
            ))}
            <span>多</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
