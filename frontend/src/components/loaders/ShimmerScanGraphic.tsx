import type { ReactNode } from 'react'
import { shimmerGraphicClass } from '@/lib/shimmerClasses'

/** 图标/图形上的扫光（与 ShimmerScanText 同节奏） */
export function ShimmerScanGraphic({
  children,
  className,
  active = true,
}: {
  children: ReactNode
  className?: string
  active?: boolean
}) {
  return (
    <span
      className={shimmerGraphicClass(active, className)}
      data-testid="shimmer-scan-graphic"
    >
      {children}
    </span>
  )
}
