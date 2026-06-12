import { useEffect, useState, type ReactNode } from 'react'
import { motionPaneClass } from '@/lib/motionClasses'
import type { MotionPhase } from './useMotionPhase'

export interface MotionPaneProps {
  paneKey: string
  children: ReactNode
  className?: string
}

export function MotionPane({ paneKey, children, className }: MotionPaneProps) {
  const [phase, setPhase] = useState<MotionPhase>('idle')

  useEffect(() => {
    setPhase('enter')
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('idle'))
    })
    return () => cancelAnimationFrame(raf)
  }, [paneKey])

  return (
    <div className={motionPaneClass(phase, className)}>
      {children}
    </div>
  )
}
