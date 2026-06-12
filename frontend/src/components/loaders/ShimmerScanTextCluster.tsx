import type { ReactNode } from 'react'
import { shimmerClusterClass } from '@/lib/shimmerClasses'

/** 多段文字共用一道扫光，且仅作用于字形（background-clip: text） */
export function ShimmerScanTextCluster({
  children,
  className,
  active = true,
  row = false,
}: {
  children: ReactNode
  className?: string
  active?: boolean
  /** 占满标题行宽度，名称+副标题+右侧提示共用一道扫光 */
  row?: boolean
}) {
  return (
    <span
      className={shimmerClusterClass(active, row, className)}
      data-testid="shimmer-scan-text-cluster"
    >
      {children}
    </span>
  )
}
