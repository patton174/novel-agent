import { css } from 'styled-components'
import { font } from './fonts'

/** 排版阶梯 — 与 globals.css 中 --text-* 对应 */
export const typography = {
  display: {
    size: 'clamp(2.25rem, 5vw, 3.5rem)',
    weight: 700,
    lineHeight: 1.15,
    letterSpacing: '-0.04em',
  },
  h1: { size: '2.2rem', weight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
  h2: { size: '2rem', weight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
  h3: { size: '1.25rem', weight: 700, lineHeight: 1.35 },
  title: { size: '1.75rem', weight: 700, lineHeight: 1.3 },
  subtitle: { size: '1.2rem', weight: 400, lineHeight: 1.7 },
  body: { size: '1rem', weight: 400, lineHeight: 1.6 },
  bodySm: { size: '0.9rem', weight: 400, lineHeight: 1.55 },
  caption: { size: '0.85rem', weight: 400, lineHeight: 1.45 },
  label: { size: '0.75rem', weight: 600, lineHeight: 1.3, letterSpacing: '0.06em' },
  micro: { size: '0.68rem', weight: 500, lineHeight: 1.4 },
  /** 编辑器 / Agent 时间线 */
  ui: { size: '0.82rem', weight: 500, lineHeight: 1.5 },
  uiSm: { size: '0.74rem', weight: 500, lineHeight: 1.45 },
  uiXs: { size: '0.68rem', weight: 600, lineHeight: 1.4, letterSpacing: '0.04em' },
} as const

export type TypographyVariant = keyof typeof typography

export function textStyle(variant: TypographyVariant, family: 'body' | 'display' | 'mono' = 'body') {
  const t = typography[variant]
  const fontFamily =
    family === 'display' ? font.display : family === 'mono' ? font.mono : font.body
  return css`
    font-family: ${fontFamily};
    font-size: ${t.size};
    font-weight: ${t.weight};
    line-height: ${t.lineHeight};
    ${'letterSpacing' in t && t.letterSpacing ? `letter-spacing: ${t.letterSpacing};` : ''}
  `
}

/** 区块标题（营销 steps / CTA 内 h2） */
export const sectionHeadingCss = css`
  ${textStyle('h1')}
  margin: 0 0 0.5rem;
`

export const sectionSubheadingCss = css`
  ${textStyle('bodySm')}
  margin: 0;
`
