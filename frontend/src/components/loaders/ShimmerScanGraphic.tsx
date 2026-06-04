import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { shimmerRowOverlayGradient, shimmerSweep } from './shimmerSweep'

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
    <Wrap className={className} $active={active} data-testid="shimmer-scan-graphic">
      {children}
    </Wrap>
  )
}

const Wrap = styled.span<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;

  & > svg {
    display: block;
  }

  ${({ $active }) =>
    $active &&
    css`
      &::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 3px;
        pointer-events: none;
        background: ${shimmerRowOverlayGradient};
        background-size: 200% 100%;
        animation: ${shimmerSweep} 1.8s linear infinite;
        mix-blend-mode: multiply;
        opacity: 0.85;
      }
    `}
`
