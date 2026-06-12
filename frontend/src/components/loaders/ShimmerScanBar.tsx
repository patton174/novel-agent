import { shimmerBarBeamClass, shimmerBarTrackClass } from '@/lib/shimmerClasses'

export interface ShimmerScanBarProps {
  className?: string
  /** 轨道高度（px） */
  height?: number
  /** 轨道宽度，默认撑满父容器 */
  width?: string
  /** 紧凑模式：更细、更淡，适合工具行内联 */
  compact?: boolean
}

/** Agent 经典 Shimmer / 扫描线 loading */
export function ShimmerScanBar({
  className,
  height,
  width = '100%',
  compact = false,
}: ShimmerScanBarProps) {
  const trackHeight = height ?? (compact ? 2 : 3)
  return (
    <div
      className={shimmerBarTrackClass(compact, className)}
      data-testid="shimmer-scan-bar"
      style={{ height: trackHeight, width }}
      aria-hidden
    >
      <div className={shimmerBarBeamClass(compact)} />
    </div>
  )
}
