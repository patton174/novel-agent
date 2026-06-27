import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const TREND_RANGES = [7, 30, 90] as const

export interface TrendRangeToggleProps {
  trendDays: number
  onChange: (days: number) => void
  className?: string
}

/** 用量趋势天数切换；单行展示，避免「近 30 天」被空格折行。 */
export function TrendRangeToggle({ trendDays, onChange, className }: TrendRangeToggleProps) {
  const { t } = useTranslation(['dashboard'])
  return (
    <div
      className={cn(
        'inline-flex shrink-0 gap-0.5 rounded-lg border-2 border-black p-0.5',
        className,
      )}
      role="group"
      aria-label={t('dashboard:usage.trendRangeLabel')}
    >
      {TREND_RANGES.map((days) => (
        <button
          key={days}
          type="button"
          onClick={() => onChange(days)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold leading-none transition-colors',
            trendDays === days
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {t('dashboard:usage.trendRangeDays', { days })}
        </button>
      ))}
    </div>
  )
}

export { TREND_RANGES }
