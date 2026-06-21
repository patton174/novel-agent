import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { font } from '../../styles/theme'
import { BRAND_NAME } from '@/lib/brand'

export type NovelAiWordmarkSize = 'sm' | 'md' | 'lg' | 'hero'

const SIZE_MAP: Record<
  NovelAiWordmarkSize,
  { width: number; height: number; novelSize: number; aiSize: number; gap: number }
> = {
  sm: { width: 158, height: 28, novelSize: 22, aiSize: 17, gap: 6 },
  md: { width: 198, height: 36, novelSize: 28, aiSize: 21, gap: 8 },
  lg: { width: 248, height: 46, novelSize: 34, aiSize: 26, gap: 10 },
  hero: { width: 340, height: 64, novelSize: 48, aiSize: 36, gap: 12 },
}

export interface NovelAiWordmarkProps {
  size?: NovelAiWordmarkSize
  /** Play stroke draw on mount (respects prefers-reduced-motion). */
  animate?: boolean
  className?: string
  /** Accessible label when not wrapped in a link. */
  label?: string
}

export function NovelAiWordmark({
  size = 'md',
  animate = true,
  className,
  label = BRAND_NAME,
}: NovelAiWordmarkProps) {
  const novelStrokeRef = useRef<SVGTextElement>(null)
  const aiStrokeRef = useRef<SVGTextElement>(null)
  const [novelLen, setNovelLen] = useState(320)
  const [aiLen, setAiLen] = useState(80)
  const dims = SIZE_MAP[size]

  useLayoutEffect(() => {
    const novelEl = novelStrokeRef.current
    const aiEl = aiStrokeRef.current
    if (!novelEl || !aiEl) return
    try {
      const nLen = novelEl.getComputedTextLength()
      const aLen = aiEl.getComputedTextLength()
      if (nLen > 0) setNovelLen(nLen + 12)
      if (aLen > 0) setAiLen(aLen + 12)
    } catch {
      // keep defaults
    }
  }, [size])

  const novelX = 2
  const baseline = dims.height - 10
  const aiX = novelX + dims.novelSize * 2.35 + dims.gap

  const svgStyle = {
    '--wordmark-novel-len': novelLen,
    '--wordmark-ai-len': aiLen,
  } as CSSProperties

  return (
    <svg
      className={cn('mkt-wordmark-svg', animate && 'mkt-wordmark-svg--animate', className)}
      style={svgStyle}
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      width={dims.width}
      height={dims.height}
    >
      <defs />

      <text
        ref={novelStrokeRef}
        className="mkt-wordmark-novel-stroke"
        x={novelX}
        y={baseline}
        fontSize={dims.novelSize}
        fontFamily={font.body}
        fontWeight={900}
        letterSpacing="-0.04em"
      >
        Novel
      </text>
      <text
        className="mkt-wordmark-fill"
        x={novelX}
        y={baseline}
        fontSize={dims.novelSize}
        fontFamily={font.body}
        fontWeight={900}
        letterSpacing="-0.04em"
        fill="currentColor"
      >
        Novel
      </text>

      <text
        ref={aiStrokeRef}
        className="mkt-wordmark-ai-stroke"
        x={aiX}
        y={baseline}
        fontSize={dims.aiSize}
        fontFamily={font.body}
        fontWeight={900}
        letterSpacing="-0.02em"
      >
        Agent
      </text>
      <text
        className="mkt-wordmark-fill"
        x={aiX}
        y={baseline}
        fontSize={dims.aiSize}
        fontFamily={font.body}
        fontWeight={900}
        letterSpacing="-0.02em"
        fill="currentColor"
      >
        Agent
      </text>
    </svg>
  )
}
