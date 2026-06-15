import { cn } from '@/lib/utils'
import { SHIMMER_OVERLAY, SHIMMER_ROW_HOST, shimmerTextClass } from '@/lib/shimmerClasses'

export interface ShimmerScanTextProps {
  children: string
  className?: string
  /** 扫光动画是否播放 */
  active?: boolean
}

/** 文字上扫过的光束效果，用于「思考中」「规划中」等状态 */
export function ShimmerScanText({
  children,
  className,
  active = true,
}: ShimmerScanTextProps) {
  if (!active) {
    return (
      <span className={shimmerTextClass(false, className)} data-testid="shimmer-scan-text">
        {children}
      </span>
    )
  }
  return (
    <span
      className={cn(SHIMMER_ROW_HOST, 'inline-block max-w-full align-baseline', className)}
      data-testid="shimmer-scan-text"
    >
      <span className="relative z-[1] text-foreground/80">{children}</span>
      <span className={SHIMMER_OVERLAY} aria-hidden />
    </span>
  )
}
