import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { shimmerSweep, shimmerTextGradient } from './shimmerSweep'

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
    <Cluster
      className={className}
      $active={active}
      $row={row}
      data-testid="shimmer-scan-text-cluster"
    >
      {children}
    </Cluster>
  )
}

const activeClusterCss = css`
  color: transparent;
  background: ${shimmerTextGradient};
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  animation: ${shimmerSweep} 1.8s linear infinite;

  & span {
    color: inherit;
    background: inherit;
    background-size: inherit;
    background-clip: inherit;
    -webkit-background-clip: inherit;
  }
`

const Cluster = styled.span<{ $active: boolean; $row?: boolean }>`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.35rem;
  max-width: 100%;

  ${({ $row }) =>
    $row &&
    `
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  `}

  ${({ $active }) => ($active ? activeClusterCss : '')}
`
