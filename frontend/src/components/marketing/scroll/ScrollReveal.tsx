import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

export type ScrollRevealVariant = 'up' | 'left' | 'right' | 'scale' | 'fade'

const variantMotion: Record<
  ScrollRevealVariant,
  { hidden: Record<string, number>; visible: Record<string, number> }
> = {
  up: { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -44 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 44 }, visible: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } },
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
}

export interface ScrollRevealProps {
  children: ReactNode
  className?: string
  variant?: ScrollRevealVariant
  delayMs?: number
  style?: CSSProperties
}

export function ScrollReveal({
  children,
  className,
  variant = 'up',
  delayMs = 0,
  style,
}: ScrollRevealProps) {
  const reduced = useReducedMotion()
  const motionState = variantMotion[variant]

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18, margin: '0px 0px -6% 0px' }}
      variants={{
        hidden: motionState.hidden,
        visible: motionState.visible,
      }}
      transition={{
        duration: 0.65,
        delay: delayMs / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
