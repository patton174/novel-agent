import { Fragment, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { DashboardActivity, DashboardActivityDay } from '@/api/dashboardApi'
import { Skeleton } from '@/components/ui/skeleton'
import {
  activityAsOfLabel,
  formatCompactMetric,
} from '@/utils/dashboardMetrics'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

export type ActivityMode = 'all' | 'writing' | 'agent'

const WEEKDAY_COL_WIDTH = '1.25rem'
const CELL_SIZE = '0.75rem'
const GRID_GAP_PX = 4
const ACTIVE_WEEK_PAD = 2

const LEVEL_CLASSES = [
  'bg-muted/50',
  'bg-indigo-200/90 dark:bg-indigo-900/45',
  'bg-indigo-400/90 dark:bg-indigo-700/70',
  'bg-indigo-600/95 dark:bg-indigo-600/85',
  'bg-indigo-800 dark:bg-indigo-500/90',
]

function heatmapGridColumns(weekCount: number): string {
  return `${WEEKDAY_COL_WIDTH} repeat(${weekCount}, ${CELL_SIZE})`
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

  const { weeks, maxValue, monthLabels } = useMemo(() => {
    const built = buildHeatmapGrid(days, mode)
    const trimmed = trimWeeksToActiveRange(built.weeks, built.monthLabels)
    return {
      ...trimmed,
      maxValue: built.maxValue,
    }
  }, [days, mode])

  const monthLabelByWeek = useMemo(
    () => new Map(monthLabels.map((m) => [m.weekIndex, m.label])),
    [monthLabels],
  )

  const weekCount = weeks.length
  const gridColumns = heatmapGridColumns(weekCount)
  const asOf = activityAsOfLabel(days, dateLocale)
  const peak = useMemo(() => {
    if (days.length === 0) return 0
    return Math.max(...days.map((day) => getDayValue(day, mode)), 0)
  }, [days, mode])

  const activeDays = useMemo(
    () => days.filter((day) => getDayValue(day, mode) > 0).length,
    [days, mode],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {t('dashboard:home.heatmapTitle')}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1 rounded-lg bg-muted p-0.5">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
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
          <p className="shrink-0 text-xs text-muted-foreground">
            {t('dashboard:home.dataAsOf', { date: asOf })}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <HeaderStat
            loading={loading}
            label={t('dashboard:home.sidePeak')}
            value={formatCompactMetric(peak, dateLocale)}
          />
          <HeaderStat
            loading={loading}
            label={t('dashboard:home.sideActiveDays')}
            value={String(activeDays)}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-4">
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-[120px] w-full rounded-lg" />
          ) : weekCount === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t('dashboard:heatmap.noData')}
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-0">
              <div
                className="mb-2 grid"
                style={{ gridTemplateColumns: gridColumns, gap: GRID_GAP_PX }}
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

              <div className="grid" style={{ gridTemplateColumns: gridColumns, gap: GRID_GAP_PX }}>
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
                            'size-3 shrink-0 rounded-[3px] transition-colors',
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

function HeaderStat({
  label,
  value,
  loading,
}: {
  label: string
  value: string
  loading?: boolean
}) {
  return (
    <div className="min-w-[4.5rem]">
      {loading ? (
        <>
          <Skeleton className="h-6 w-14" />
          <Skeleton className="mt-1 h-3 w-12" />
        </>
      ) : (
        <>
          <p className="text-lg font-bold tabular-nums leading-none text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </>
      )}
    </div>
  )
}
