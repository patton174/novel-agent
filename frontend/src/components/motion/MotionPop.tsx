import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motionPopClass } from '@/lib/motionClasses'
import { useMotionPhase } from './useMotionPhase'

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
    <div
      ref={ref}
      className={cn(motionPopClass(phase, placement), className)}
      style={style}
      data-motion-phase={phase}
    >
      {children}
    </div>
  )
})
