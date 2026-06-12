import { cn } from '@/lib/utils'
import type { MotionPhase } from '@/components/motion/useMotionPhase'
import type { MotionPopPlacement } from '@/components/motion/MotionPop'

export const MOTION_INTERACTIVE = 'motion-interactive'

export const MOTION_MORPH = 'motion-morph'

export const MOTION_INDICATOR = 'motion-indicator'

export function motionInteractiveClass(className?: string) {
  return cn(MOTION_INTERACTIVE, className)
}

export function motionMorphClass(className?: string) {
  return cn(MOTION_MORPH, className)
}

export function motionIndicatorClass(className?: string) {
  return cn(MOTION_INDICATOR, className)
}

export function motionPopSurfaceClass(
  placement: MotionPopPlacement = 'bottom',
  className?: string,
) {
  return cn(
    'motion-pop-surface',
    placement === 'top' ? 'motion-pop-surface--top' : 'motion-pop-surface--bottom',
    className,
  )
}

export function motionPopClass(
  phase: MotionPhase,
  placement: MotionPopPlacement = 'bottom',
  className?: string,
) {
  const phaseClass =
    phase === 'idle'
      ? 'motion-pop--idle'
      : phase === 'exit'
        ? placement === 'top'
          ? 'motion-pop--exit-top'
          : 'motion-pop--exit-bottom'
        : placement === 'top'
          ? 'motion-pop--enter-top'
          : 'motion-pop--enter-bottom'

  return cn(motionPopSurfaceClass(placement), phaseClass, className)
}

export function motionPaneClass(phase: MotionPhase, className?: string) {
  return cn(
    'motion-pane flex min-h-0 min-w-0 flex-col',
    phase === 'idle' ? 'motion-pane--idle' : 'motion-pane--enter',
    className,
  )
}
