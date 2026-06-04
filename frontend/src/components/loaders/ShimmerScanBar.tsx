import styled, { keyframes } from 'styled-components'
import { palette } from '../../styles/theme'

export interface ShimmerScanBarProps {
  className?: string
  /** 轨道高度（px） */
  height?: number
  /** 轨道宽度，默认撑满父容器 */
  width?: string
  /** 紧凑模式：更细、更淡，适合工具行内联 */
  compact?: boolean
}

const sweep = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
`

/** Agent 经典 Shimmer / 扫描线 loading */
export function ShimmerScanBar({
  className,
  height,
  width = '100%',
  compact = false,
}: ShimmerScanBarProps) {
  const trackHeight = height ?? (compact ? 2 : 3)
  return (
    <Track
      className={className}
      data-testid="shimmer-scan-bar"
      $height={trackHeight}
      $width={width}
      $compact={compact}
      aria-hidden
    >
      <Beam $compact={compact} />
    </Track>
  )
}

const Track = styled.div<{ $height: number; $width: string; $compact: boolean }>`
  position: relative;
  width: ${({ $width }) => $width};
  height: ${({ $height }) => $height}px;
  overflow: hidden;
  border-radius: 999px;
  background: ${({ $compact }) => ($compact ? palette.accentSoft : palette.accentMuted)};
  flex-shrink: 0;
`

const Beam = styled.div<{ $compact: boolean }>`
  position: absolute;
  inset: 0;
  width: 60%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(233, 181, 11, ${({ $compact }) => ($compact ? 0.08 : 0.12)}) 25%,
    rgba(233, 181, 11, ${({ $compact }) => ($compact ? 0.45 : 0.65)}) 50%,
    rgba(233, 181, 11, ${({ $compact }) => ($compact ? 0.08 : 0.12)}) 75%,
    transparent 100%
  );
  animation: ${sweep} ${({ $compact }) => ($compact ? 1.2 : 1.5)}s ease-in-out infinite;
`
