import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  PIXEL_CHART_CARD,
  PIXEL_CHART_DESC,
  PIXEL_CHART_HEADER,
  PIXEL_CHART_TITLE,
} from '../pixelTokens'

export function PixelChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn(PIXEL_CHART_CARD, className)}>
      <header className={cn(PIXEL_CHART_HEADER, action && 'flex items-start justify-between gap-3')}>
        <div className="min-w-0">
          <h3 className={PIXEL_CHART_TITLE}>{title}</h3>
          {description ? <p className={PIXEL_CHART_DESC}>{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  )
}
