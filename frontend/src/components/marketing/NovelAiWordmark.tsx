import { useId, useLayoutEffect, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { font, palette } from '../../styles/theme'

export type NovelAiWordmarkSize = 'sm' | 'md' | 'lg' | 'hero'

const SIZE_MAP: Record<
  NovelAiWordmarkSize,
  { width: number; height: number; novelSize: number; aiSize: number; gap: number }
> = {
  sm: { width: 118, height: 28, novelSize: 22, aiSize: 20, gap: 6 },
  md: { width: 148, height: 36, novelSize: 28, aiSize: 26, gap: 8 },
  lg: { width: 188, height: 46, novelSize: 34, aiSize: 32, gap: 10 },
  hero: { width: 268, height: 64, novelSize: 48, aiSize: 44, gap: 12 },
}

const fillReveal = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const aiGlow = keyframes`
  0%,
  100% {
    filter: drop-shadow(0 0 0 rgba(79, 70, 229, 0));
  }
  50% {
    filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.45));
  }
`

const underlineGrow = keyframes`
  from {
    stroke-dashoffset: 120;
  }
  to {
    stroke-dashoffset: 0;
  }
`

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
  label = 'Novel AI',
}: NovelAiWordmarkProps) {
  const uid = useId().replace(/:/g, '')
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

  return (
    <WordmarkSvg
      className={className}
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      width={dims.width}
      height={dims.height}
      $animate={animate}
      $novelLen={novelLen}
      $aiLen={aiLen}
    >
      <defs>
        <linearGradient id={`${uid}-ai-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="45%" stopColor={palette.accent} />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id={`${uid}-novel-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor={palette.ink} />
        </linearGradient>
      </defs>

      <path
        className="wordmark-underline"
        d={`M ${novelX} ${baseline + 6} Q ${dims.width * 0.35} ${baseline + 14} ${aiX + dims.aiSize * 0.9} ${baseline + 5}`}
        fill="none"
        stroke={palette.accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={120}
        strokeDasharray={120}
        opacity={0.55}
      />

      <text
        ref={novelStrokeRef}
        className="stroke-layer novel-stroke"
        x={novelX}
        y={baseline}
        fontSize={dims.novelSize}
        fontFamily={font.display}
        fontWeight={700}
        fontStyle="italic"
        letterSpacing="-0.04em"
      >
        Novel
      </text>
      <text
        className="fill-layer novel-fill"
        x={novelX}
        y={baseline}
        fontSize={dims.novelSize}
        fontFamily={font.display}
        fontWeight={700}
        fontStyle="italic"
        letterSpacing="-0.04em"
        fill={`url(#${uid}-novel-fill)`}
      >
        Novel
      </text>

      <text
        ref={aiStrokeRef}
        className="stroke-layer ai-stroke"
        x={aiX}
        y={baseline}
        fontSize={dims.aiSize}
        fontFamily={font.body}
        fontWeight={800}
        letterSpacing="0.06em"
      >
        AI
      </text>
      <text
        className="fill-layer ai-fill"
        x={aiX}
        y={baseline}
        fontSize={dims.aiSize}
        fontFamily={font.body}
        fontWeight={800}
        letterSpacing="0.06em"
        fill={`url(#${uid}-ai-fill)`}
      >
        AI
      </text>
    </WordmarkSvg>
  )
}

const WordmarkSvg = styled.svg<{
  $animate: boolean
  $novelLen: number
  $aiLen: number
}>`
  display: block;
  overflow: visible;

  .stroke-layer {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    paint-order: stroke fill;
  }

  .novel-stroke {
    stroke: ${palette.ink};
    stroke-width: 1.35;
    stroke-dasharray: ${({ $novelLen }) => $novelLen};
    stroke-dashoffset: ${({ $novelLen, $animate }) => ($animate ? 0 : $novelLen)};
    transition: stroke-dashoffset 0.05s;
    ${({ $animate, $novelLen }) =>
      $animate &&
      css`
        animation: novel-draw 1.35s cubic-bezier(0.45, 0, 0.2, 1) forwards;
        @keyframes novel-draw {
          from {
            stroke-dashoffset: ${$novelLen};
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}
  }

  .ai-stroke {
    stroke: ${palette.accentDeep};
    stroke-width: 1.6;
    stroke-dasharray: ${({ $aiLen }) => $aiLen};
    stroke-dashoffset: ${({ $animate, $aiLen }) => ($animate ? 0 : $aiLen)};
    ${({ $animate, $aiLen }) =>
      $animate &&
      css`
        animation: ai-draw 1s cubic-bezier(0.45, 0, 0.2, 1) 0.55s forwards;
        @keyframes ai-draw {
          from {
            stroke-dashoffset: ${$aiLen};
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}
  }

  .fill-layer {
    opacity: 0;
    ${({ $animate }) =>
      $animate
        ? css`
            &.novel-fill {
              animation: ${fillReveal} 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.85s forwards;
            }
            &.ai-fill {
              animation:
                ${fillReveal} 0.65s cubic-bezier(0.22, 1, 0.36, 1) 1.15s forwards,
                ${aiGlow} 3s ease-in-out 2s infinite;
            }
          `
        : css`
            opacity: 1;
          `}
  }

  .wordmark-underline {
    stroke-dasharray: 120;
    stroke-dashoffset: 120;
    ${({ $animate }) =>
      $animate
        ? css`
            animation: ${underlineGrow} 1.1s cubic-bezier(0.45, 0, 0.2, 1) 1.4s forwards;
          `
        : css`
            stroke-dashoffset: 0;
          `}
  }

  @media (prefers-reduced-motion: reduce) {
    .novel-stroke,
    .ai-stroke,
    .wordmark-underline {
      animation: none !important;
      stroke-dashoffset: 0;
      transition: none;
    }
    .fill-layer {
      animation: none !important;
      opacity: 1;
    }
  }
`
