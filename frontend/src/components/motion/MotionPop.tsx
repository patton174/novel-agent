import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import styled from 'styled-components'
import { motionPopCss, motionPopSurfaceCss } from './motionStyles'
import { useMotionPhase, type MotionPhase } from './useMotionPhase'

export type MotionPopPlacement = 'top' | 'bottom'

export interface MotionPopProps {
  open: boolean
  placement?: MotionPopPlacement
  style?: CSSProperties
  className?: string
  children: ReactNode
}

export const MotionPop = forwardRef<HTMLDivElement, MotionPopProps>(function MotionPop(
  { open, placement = 'bottom', style, className, children },
  ref,
) {
  const { mounted, phase } = useMotionPhase(open)

  if (!mounted) return null

  return (
    <PopSurface
      ref={ref}
      className={className}
      style={style}
      $phase={phase}
      $placement={placement}
      data-motion-phase={phase}
    >
      {children}
    </PopSurface>
  )
})

const PopSurface = styled.div<{ $phase: MotionPhase; $placement: MotionPopPlacement }>`
  ${({ $placement }) => motionPopSurfaceCss($placement)}
  ${({ $phase, $placement }) => motionPopCss($phase, $placement)}
`
