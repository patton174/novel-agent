import { Fragment, useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { DashboardActivity, DashboardActivityDay } from '@/api/dashboardApi'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

export type ActivityMode = 'all' | 'writing' | 'agent'

const MAX_WEEKS = 13
const MIN_WEEKS = 4
const WEEKDAY_COL_REM = 1.25
const GRID_GAP_REM = 0.1875 // 3px in rem

const LEVEL_CLASSES = [
  'bg-muted/50',
  'bg-indigo-200/90 dark:bg-indigo-900/45',
  'bg-indigo-400/90 dark:bg-indigo-700/70',
  'bg-indigo-600/95 dark:bg-indigo-600/85',
  'bg-indigo-800 dark:bg-indigo-500/90',
]

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

function buildRecentWeeksGrid(
  days: DashboardActivityDay[],
  mode: ActivityMode,
  recentWeeks: number,
) {
  const valueByDate = new Map(days.map((d) => [d.date, getDayValue(d, mode)]))
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const gridStart = new Date(today)
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay())
  gridStart.setUTCDate(gridStart.getUTCDate() - 7 * (recentWeeks - 1))

  const gridEnd = new Date(today)
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()))

  const weeks: HeatCell[][] = []
  const monthLabels: { weekIndex: number; label: string }[] = []
  let lastMonth = -1
  const cursor = new Date(gridStart)
  let weekIndex = 0
  let weekCount = 0

  while (cursor <= gridEnd && weekCount < recentWeeks) {
    const weekStart = new Date(cursor)
    const week: HeatCell[] = []

    for (let dow = 0; dow < 7; dow++) {
      const iso = formatIsoUtc(cursor)
      const isFuture = cursor > today
      week.push({
        date: isFuture ? null : iso,
        value: isFuture ? 0 : (valueByDate.get(iso) ?? 0),
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
    weekCount++
  }

  let maxValue = 1
  for (const week of weeks) {
    for (const cell of week) {
      if (cell.date && cell.value > maxValue) {
        maxValue = cell.value
      }
    }
  }

  return { weeks, maxValue, monthLabels }
}

function formatTooltip(
  date: string,
  value: number,
  mode: ActivityMode,
  t: (key: string) => string,
  dateLocale: string,
): string {
  const label = parseUtcDate(date).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  if (value <= 0) return `${label}：${t('dashboard:heatmap.tooltipNoActivity')}`
  if (mode === 'agent') return `${label}：${value} ${t('dashboard:heatmap.tooltipAgent')}`
  if (mode === 'writing') {
    return `${label}：${value.toLocaleString(dateLocale)} ${t('dashboard:heatmap.tooltipWriting')}`
  }
  return `${label}：${t('dashboard:heatmap.tooltipAll')} ${value.toLocaleString(dateLocale)}`
}

interface ActivityHeatmapProps {
  activity: DashboardActivity | null
  loading?: boolean
}

export function ActivityHeatmap({ activity, loading }: ActivityHeatmapProps) {
  const { t } = useTranslation(['dashboard'])
  const [mode, setMode] = useState<ActivityMode>('all')
  const days = activity?.days ?? []
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Calculate how many weeks fit based on container width
  const calcWeeksAndCellSize = useCallback((width: number) => {
    const availableWidth = width - WEEKDAY_COL_REM - GRID_GAP_REM
    const maxWeeks = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.floor(availableWidth / (0.65 + GRID_GAP_REM))))
    // Cap cell size so 7 rows + month header stays within ~320px container height
    const rawCellSize = (availableWidth - maxWeeks * GRID_GAP_REM) / maxWeeks
    const cellSize = Math.min(1.0, Math.max(0.5, rawCellSize))
    return { weeks: maxWeeks, cellSize }
  }, [])

  // Listen to container width changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    // Initial measurement
    setContainerWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const { weeks: visibleWeeks, cellSize } = useMemo(() => {
    if (containerWidth === 0) return { weeks: MAX_WEEKS, cellSize: 0.65 }
    return calcWeeksAndCellSize(containerWidth)
  }, [containerWidth, calcWeeksAndCellSize])

  const MODE_OPTIONS: { id: ActivityMode; label: string }[] = useMemo(
    () => [
      { id: 'all', label: t('dashboard:heatmap.modeAll') },
      { id: 'writing', label: t('dashboard:heatmap.modeWriting') },
      { id: 'agent', label: t('dashboard:heatmap.modeAgent') },
    ],
    [t],
  )

  const WEEKDAY_LABELS = useMemo(
    () =>
      i18n.language === 'zh'
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    [i18n.language],
  )

  const { weeks, maxValue, monthLabels } = useMemo(
    () => buildRecentWeeksGrid(days, mode, visibleWeeks),
    [days, mode, visibleWeeks],
  )

  const monthLabelByWeek = useMemo(
    () => new Map(monthLabels.map((m) => [m.weekIndex, m.label])),
    [monthLabels],
  )

  const weekCount = weeks.length
  const cellSizeRem = `${cellSize}rem`
  const gridColumns = `${WEEKDAY_COL_REM}rem repeat(${weekCount}, ${cellSizeRem})`

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {t('dashboard:home.heatmapTitle')}
        </h2>
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
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-4 overflow-hidden">
        <div className="min-w-0 h-full" ref={containerRef}>
          {loading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : (
            <div className="relative h-full w-full overflow-auto">
              <div
                className="mb-2 grid min-w-max content-start"
                style={{ gridTemplateColumns: gridColumns, gap: `${GRID_GAP_REM}rem` }}
              >
                <div aria-hidden />
                {weeks.map((_, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="truncate text-[10px] font-medium leading-none text-muted-foreground"
                  >
                    {monthLabelByWeek.get(weekIndex)
                      ? t('dashboard:heatmap.monthAxis', { month: monthLabelByWeek.get(weekIndex) })
                      : ''}
                  </div>
                ))}
              </div>

              <div className="grid" style={{ gridTemplateColumns: gridColumns, gap: `${GRID_GAP_REM}rem` }}>
                {Array.from({ length: 7 }).map((_, rowIndex) => (
                  <Fragment key={rowIndex}>
                    <div className="flex items-center text-[10px] font-medium leading-none text-muted-foreground">
                      {WEEKDAY_LABELS[rowIndex]}
                    </div>
                    {weeks.map((week, weekIndex) => {
                      const cell = week[rowIndex]
                      const level = cell.date ? valueToLevel(cell.value, maxValue) : 0
                      return (
                        <div
                          key={`${weekIndex}-${rowIndex}`}
                          title={
                            cell.date
                              ? formatTooltip(cell.date, cell.value, mode, t, dateLocale)
                              : undefined
                          }
                          className={cn(
                            'shrink-0 rounded-[3px] transition-colors',
                            cellClass(cell, level),
                          )}
                          style={{ width: cellSizeRem, height: cellSizeRem }}
                        />
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
            <span>{t('dashboard:heatmap.less')}</span>
            {LEVEL_CLASSES.map((cls, i) => (
              <div key={i} className={cn('size-3 rounded-[2px]', cls)} />
            ))}
            <span>{t('dashboard:heatmap.more')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
