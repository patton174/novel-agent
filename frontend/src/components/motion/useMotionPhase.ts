import { useEffect, useState } from 'react'
import { motion } from '../../styles/motion'

export type MotionPhase = 'enter' | 'idle' | 'exit'

/**
 * 控制「展开 → 停留 → 收起」三阶段，供下拉、浮层、折叠区复用。
 */
export function useMotionPhase(
  open: boolean,
  durationMs: number = motion.duration.pop,
): { mounted: boolean; phase: MotionPhase } {
  const [mounted, setMounted] = useState(open)
  const [phase, setPhase] = useState<MotionPhase>(open ? 'enter' : 'exit')

  useEffect(() => {
    if (open) {
      setMounted(true)
      setPhase('enter')
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('idle'))
      })
      return () => cancelAnimationFrame(raf)
    }
    if (!mounted) return undefined
    setPhase('exit')
    const timer = window.setTimeout(() => {
      setMounted(false)
      setPhase('enter')
    }, durationMs)
    return () => clearTimeout(timer)
  }, [open, mounted, durationMs])

  return { mounted, phase }
}
