import { keyframes } from 'styled-components'
import { palette } from '../../styles/theme'

export const shimmerSweep = keyframes`
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
`

export const shimmerTextGradient = `linear-gradient(
  90deg,
  ${palette.textFaint} 0%,
  ${palette.textFaint} 35%,
  ${palette.accent} 50%,
  ${palette.textFaint} 65%,
  ${palette.textFaint} 100%
)`

export const shimmerRowOverlayGradient = `linear-gradient(
  90deg,
  transparent 0%,
  transparent 38%,
  ${palette.accent}55 50%,
  transparent 62%,
  transparent 100%
)`
