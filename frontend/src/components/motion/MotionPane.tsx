import { useEffect, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { motionPaneCss } from './motionStyles'
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
    <PaneRoot className={className} $phase={phase}>
      {children}
    </PaneRoot>
  )
}

const PaneRoot = styled.div<{ $phase: MotionPhase }>`
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  ${({ $phase }) => motionPaneCss($phase)}
`
