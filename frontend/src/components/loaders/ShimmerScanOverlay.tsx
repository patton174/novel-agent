import { SHIMMER_OVERLAY } from '@/lib/shimmerClasses'

/** 整行统一扫光（覆盖图标 + 标题 + 副标题，避免分段闪烁） */
export function ShimmerScanOverlay({ active }: { active?: boolean }) {
  if (!active) {
    return null
  }
  return <span className={SHIMMER_OVERLAY} aria-hidden data-testid="shimmer-scan-overlay" />
}

export { SHIMMER_ROW_HOST as shimmerRowHostClass } from '@/lib/shimmerClasses'
