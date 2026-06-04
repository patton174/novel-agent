import styled from 'styled-components'
import { palette } from '../../styles/theme'
import { shimmerSweep, shimmerTextGradient } from './shimmerSweep'

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
  return (
    <Label className={className} $active={active} data-testid="shimmer-scan-text">
      {children}
    </Label>
  )
}

const Label = styled.span<{ $active: boolean }>`
  display: inline-block;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  color: ${({ $active }) => ($active ? 'transparent' : palette.textMuted)};
  background: ${({ $active }) => ($active ? shimmerTextGradient : 'none')};
  background-size: 200% auto;
  background-clip: ${({ $active }) => ($active ? 'text' : 'border-box')};
  -webkit-background-clip: ${({ $active }) => ($active ? 'text' : 'border-box')};
  animation: ${({ $active }) => ($active ? shimmerSweep : 'none')} 1.8s linear infinite;
`
