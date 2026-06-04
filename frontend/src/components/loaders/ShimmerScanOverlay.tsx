import styled, { css } from 'styled-components'
import { shimmerRowOverlayGradient, shimmerSweep } from './shimmerSweep'

/** 整行统一扫光（覆盖图标 + 标题 + 副标题，避免分段闪烁） */
export function ShimmerScanOverlay({ active }: { active?: boolean }) {
  if (!active) {
    return null
  }
  return <Overlay aria-hidden data-testid="shimmer-scan-overlay" />
}

const Overlay = styled.span`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: 4px;
  background: ${shimmerRowOverlayGradient};
  background-size: 200% 100%;
  animation: ${shimmerSweep} 1.8s linear infinite;
  mix-blend-mode: multiply;
  opacity: 0.9;
`

export const shimmerRowHostCss = css`
  position: relative;
  isolation: isolate;
`
