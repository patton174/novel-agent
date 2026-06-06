import { Fragment, useMemo, useState } from 'react'
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

/** 与网格 gap、标签列宽、格子尺寸保持一致 */
const WEEKDAY_COL_WIDTH = '1.25rem'
const CELL_SIZE_PX = 14
const GRID_GAP_PX = 4
const ACTIVE_WEEK_PAD = 2
const MIN_VISIBLE_WEEKS = 26

const WEEKDAY_LABELS = [
  { row: 0, label: '日' },
  { row: 1, label: '一' },
  { row: 3, label: '三' },
  { row: 5, label: '五' },
]

const LEVEL_CLASSES = [
  'bg-muted/50 ring-1 ring-border/40',
  'bg-indigo-200/90 ring-1 ring-indigo-300/50 dark:bg-indigo-900/45',
  'bg-indigo-400/90 ring-1 ring-indigo-400/40 dark:bg-indigo-700/70',
  'bg-indigo-600/95 ring-1 ring-indigo-500/30 dark:bg-indigo-600/85',
  'bg-indigo-800 ring-1 ring-indigo-700/40 dark:bg-indigo-500/90',
]

function heatmapGridColumns(weekCount: number): string {
  return `${WEEKDAY_COL_WIDTH} repeat(${weekCount}, ${CELL_SIZE_PX}px)`
}

function padWeeksToMinimum(
  weeks: HeatCell[][],
  monthLabels: { weekIndex: number; label: string }[],
  minWeeks: number,
) {
  if (weeks.length >= minWeeks) {
    return { weeks, monthLabels }
  }
  const pad = minWeeks - weeks.length
  const emptyWeek: HeatCell[] = Array.from({ length: 7 }, () => ({ date: null, value: 0 }))
  const paddedWeeks = [...Array.from({ length: pad }, () => emptyWeek.map((c) => ({ ...c }))), ...weeks]
  return {
    weeks: paddedWeeks,
    monthLabels: monthLabels.map((m) => ({ ...m, weekIndex: m.weekIndex + pad })),
  }
}

function trimWeeksToActiveRange(
  weeks: HeatCell[][],
  monthLabels: { weekIndex: number; label: string }[],
  padWeeks = ACTIVE_WEEK_PAD,
) {
  if (weeks.length === 0) {
    return { weeks, monthLabels }
  }

  let firstActive = -1
  let lastActive = -1
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    for (const cell of weeks[weekIndex]) {
      if (cell.date && cell.value > 0) {
        if (firstActive === -1) {
          firstActive = weekIndex
        }
        lastActive = weekIndex
      }
    }
  }

  // 无活跃：只展示最近 12 周，避免整年空白
  if (firstActive === -1) {
    const tail = Math.min(12, weeks.length)
    const start = weeks.length - tail
    return {
      weeks: weeks.slice(start),
      monthLabels: monthLabels
        .filter((m) => m.weekIndex >= start)
        .map((m) => ({ ...m, weekIndex: m.weekIndex - start })),
    }
  }

  const start = Math.max(0, firstActive - padWeeks)
  const end = Math.min(weeks.length - 1, lastActive + padWeeks)
  return {
    weeks: weeks.slice(start, end + 1),
    monthLabels: monthLabels
      .filter((m) => m.weekIndex >= start && m.weekIndex <= end)
      .map((m) => ({ ...m, weekIndex: m.weekIndex - start })),
  }
}

function cellClass(cell: HeatCell, level: number): string {
  if (!cell.date) {
    return 'bg-transparent'
  }
  if (cell.value <= 0) {
    return 'bg-muted/25 dark:bg-muted/35'
  }
  return LEVEL_CLASSES[level]
}

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

  const { weeks, maxValue, monthLabels } = useMemo(() => {
    const built = buildHeatmapGrid(days, mode)
    const trimmed = trimWeeksToActiveRange(built.weeks, built.monthLabels)
    const padded = padWeeksToMinimum(trimmed.weeks, trimmed.monthLabels, MIN_VISIBLE_WEEKS)
    return {
      ...padded,
      maxValue: built.maxValue,
    }
  }, [days, mode])

  const streaks = useMemo(() => computeStreaks(days, mode), [days, mode])
  const highlights = useMemo(() => computeHighlights(days, mode), [days, mode])
  const activeMode = MODE_OPTIONS.find((m) => m.id === mode)!

  const monthLabelByWeek = useMemo(
    () => new Map(monthLabels.map((m) => [m.weekIndex, m.label])),
    [monthLabels],
  )

  const weekCount = weeks.length
  const gridColumns = heatmapGridColumns(weekCount)

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
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
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
          <Skeleton className="mx-auto h-[95px] w-full max-w-md rounded-lg" />
        ) : weekCount === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无活跃数据</p>
        ) : (
          <div className="w-full overflow-x-auto pb-1">
            <div className="min-w-fit">
              <div
                className="mb-2 grid"
                style={{
                  gridTemplateColumns: gridColumns,
                  gap: GRID_GAP_PX,
                }}
              >
                <div aria-hidden />
                {weeks.map((_, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="truncate text-[10px] font-medium leading-none text-muted-foreground"
                  >
                    {monthLabelByWeek.get(weekIndex) ? `${monthLabelByWeek.get(weekIndex)}月` : ''}
                  </div>
                ))}
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: gridColumns,
                  gap: GRID_GAP_PX,
                }}
              >
                {Array.from({ length: 7 }).map((_, rowIndex) => (
                  <Fragment key={rowIndex}>
                    <div className="flex items-center text-[10px] font-medium leading-none text-muted-foreground">
                      {WEEKDAY_LABELS.find((l) => l.row === rowIndex)?.label ?? ''}
                    </div>
                    {weeks.map((week, weekIndex) => {
                      const cell = week[rowIndex]
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
                            'size-[14px] shrink-0 rounded-[3px] transition-colors',
                            cellClass(cell, level),
                          )}
                        />
                      )
                    })}
                  </Fragment>
                ))}
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
