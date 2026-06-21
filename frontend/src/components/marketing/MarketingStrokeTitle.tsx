import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { font } from '@/styles/fonts'

export type MarketingStrokeTitleSize = 'hero' | 'subpage' | 'section' | 'cta'

const SIZE_CLASS: Record<MarketingStrokeTitleSize, string> = {
  hero: 'text-[clamp(2rem,5.5vw,4.25rem)] leading-[0.95] uppercase',
  subpage: 'text-[clamp(1.75rem,4vw,3rem)] leading-[0.95] uppercase',
  section: 'text-[clamp(1.5rem,3.2vw,2.25rem)] leading-[0.95] uppercase',
  cta: 'text-[clamp(1.35rem,2.8vw,2.25rem)] leading-[0.95] uppercase',
}

const FONT_SIZE: Record<MarketingStrokeTitleSize, number> = {
  hero: 68,
  subpage: 48,
  section: 36,
  cta: 32,
}

export function MarketingStrokeTitle({
  text,
  size = 'subpage',
  variant = 'default',
  animate = true,
  className,
  block = false,
}: {
  text: string
  size?: MarketingStrokeTitleSize
  variant?: 'default' | 'accent' | 'onDark'
  animate?: boolean
  className?: string
  /** 独占一行（用于多行主标题） */
  block?: boolean
}) {
  const strokeRef = useRef<SVGTextElement>(null)
  const [strokeLen, setStrokeLen] = useState(480)
  const reduced = useReducedMotion()
  const shouldAnimate = animate && !reduced
  const fontSize = FONT_SIZE[size]
  const baseline = fontSize * 0.88
  const viewH = fontSize * 1.15
  const viewW = Math.max(strokeLen + 24, fontSize * text.length * 0.55)

  useLayoutEffect(() => {
    const el = strokeRef.current
    if (!el) return
    try {
      const len = el.getComputedTextLength()
      if (len > 0) setStrokeLen(len + 16)
    } catch {
      // keep default
    }
  }, [text, size])

  const strokeColor =
    variant === 'onDark'
      ? 'rgba(255, 255, 255, 0.95)'
      : variant === 'accent'
        ? '#1043ff'
        : 'currentColor'

  const fillColor =
    variant === 'onDark'
      ? '#ffffff'
      : variant === 'accent'
        ? '#1043ff'
        : 'currentColor'

  const svgStyle = {
    '--mkt-stroke-len': strokeLen,
  } as CSSProperties

  return (
    <span
      className={cn(
        'mkt-stroke-title',
        SIZE_CLASS[size],
        block ? 'block w-full' : 'inline-block max-w-full',
        'font-black tracking-tighter',
        variant === 'default' && 'text-ink',
        variant === 'accent' && 'text-primary',
        variant === 'onDark' && 'text-white',
        className,
      )}
      role="text"
      aria-label={text}
    >
      <svg
        className={cn('mkt-stroke-title-svg', shouldAnimate && 'mkt-stroke-title-svg--animate')}
        style={svgStyle}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${viewW} ${viewH}`}
        width="100%"
        height="1.15em"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <text
          ref={strokeRef}
          className="mkt-stroke-title-stroke"
          x={viewW / 2}
          y={baseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily={font.body}
          fontWeight={900}
          letterSpacing="-0.04em"
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {text}
        </text>
        <text
          className="mkt-stroke-title-fill"
          x={viewW / 2}
          y={baseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily={font.body}
          fontWeight={900}
          letterSpacing="-0.04em"
          fill={fillColor}
        >
          {text}
        </text>
      </svg>
    </span>
  )
}
