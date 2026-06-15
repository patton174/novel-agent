import { shimmerTextClass } from '@/lib/shimmerClasses'

export interface ShimmerScanTextProps {
  children: string
  className?: string
  /** 扫光动画是否播放 */
  active?: boolean
}

/** 文字上扫过的光束效果，仅作用于字形（background-clip: text） */
export function ShimmerScanText({
  children,
  className,
  active = true,
}: ShimmerScanTextProps) {
  return (
    <span
      className={shimmerTextClass(active, className)}
      data-testid="shimmer-scan-text"
    >
      {children}
    </span>
  )
}
