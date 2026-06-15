import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { font } from '@/styles/fonts'

export type MarketingStrokeTitleSize = 'hero' | 'subpage' | 'section' | 'cta'

const SIZE_CLASS: Record<MarketingStrokeTitleSize, string> = {
  hero: 'text-[clamp(2rem,5.5vw,4.25rem)] leading-[1.1]',
  subpage: 'text-[clamp(1.75rem,4vw,3rem)] leading-tight',
  section: 'text-[clamp(1.5rem,3.2vw,2.25rem)] leading-tight',
  cta: 'text-[clamp(1.35rem,2.8vw,2.25rem)] leading-tight',
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
  const uid = useId().replace(/:/g, '')
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
      ? 'rgba(199, 210, 254, 0.95)'
      : variant === 'accent'
        ? '#6366f1'
        : 'currentColor'

  const fillId =
    variant === 'accent'
      ? `${uid}-accent-fill`
      : variant === 'onDark'
        ? `${uid}-ondark-fill`
        : `${uid}-default-fill`

  const svgStyle = {
    '--mkt-stroke-len': strokeLen,
  } as CSSProperties

  return (
    <span
      className={cn(
        'mkt-stroke-title',
        SIZE_CLASS[size],
        block ? 'block w-full' : 'inline-block max-w-full',
        variant === 'default' && 'text-foreground',
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
        <defs>
          {variant === 'accent' ? (
            <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="35%" stopColor="#6366f1" />
              <stop offset="65%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          ) : variant === 'onDark' ? (
            <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          ) : (
            <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--foreground)" />
              <stop offset="100%" stopColor="var(--foreground)" />
            </linearGradient>
          )}
        </defs>

        <text
          ref={strokeRef}
          className="mkt-stroke-title-stroke"
          x={viewW / 2}
          y={baseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily={variant === 'accent' ? font.display : font.body}
          fontWeight={700}
          letterSpacing="-0.02em"
          fill="none"
          stroke={strokeColor}
          strokeWidth={variant === 'accent' ? 2.2 : 1.8}
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
          fontFamily={variant === 'accent' ? font.display : font.body}
          fontWeight={700}
          letterSpacing="-0.02em"
          fill={`url(#${fillId})`}
        >
          {text}
        </text>
      </svg>
    </span>
  )
}
