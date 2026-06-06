/**
 * 全站设计令牌（浅色新拟态）。CSS 变量见 globals.css，需保持数值一致。
 */
export const palette = {
  bg: '#f8fafc',
  bgPage: '#ffffff',
  bgSidebar: '#f8fafc',
  bgElevated: '#ffffff',
  bgHover: '#f1f5f9',
  bgInset: '#f1f5f9',
  ink: '#0f172a',
  inkSoft: '#1e293b',
  inkHover: '#334155',
  text: '#0f172a',
  textBody: '#334155',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  textSubtle: '#64748b',
  textDim: '#94a3b8',
  textPlaceholder: '#cbd5e1',
  textThink: '#64748b',
  textThinkHeading: '#475569',
  accent: '#4f46e5',
  accentHover: '#4338ca',
  accentDark: '#3730a3',
  accentMuted: 'rgba(79, 70, 229, 0.1)',
  accentSoft: 'rgba(79, 70, 229, 0.05)',
  accentGhost: 'rgba(79, 70, 229, 0.08)',
  accentLine: 'rgba(79, 70, 229, 0.4)',
  accentLineSoft: 'rgba(79, 70, 229, 0.2)',
  accentLineFaint: 'rgba(79, 70, 229, 0.1)',
  accentGlow: 'rgba(79, 70, 229, 0.3)',
  accentDeep: '#312e81',
  traceOk: '#10b981',
  activeBg: 'rgba(79, 70, 229, 0.08)',
  error: '#ef4444',
  errorBright: '#dc2626',
  errorInput: '#f87171',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  success: '#10b981',
  successBright: '#059669',
  warning: '#f59e0b',
  brandBlue: '#3b82f6',
  brandGreen: '#10b981',
  brandRed: '#ef4444',
  brandOrange: '#f59e0b',
  brandPurple: '#8b5cf6',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  borderTable: '#e2e8f0',
  overlay: 'rgba(15, 23, 42, 0.4)',
  chrome: '#ffffff',
  codeBg: '#f8fafc',
  white: '#ffffff',
  black: '#000000',
  shadowDark: 'rgba(0, 0, 0, 0.05)',
  shadowLight: 'rgba(255, 255, 255, 1)',
  shadowMid: 'rgba(0, 0, 0, 0.08)',
  shadowSoft: 'rgba(0, 0, 0, 0.02)',
  divider: '#e2e8f0',
  footerDot: '#cbd5e1',
  surfaceAlpha: 'rgba(255, 255, 255, 0.8)',
  codeText: '#334155',
  proseMuted: '#475569',
  proseCodeBg: '#f1f5f9',
  proseCodeBgBlock: '#f8fafc',
  proseTableHead: '#f8fafc',
  proseTableStripe: '#f8fafc',
  proseBlockquoteBg: '#f1f5f9',
  proseThinkBg: '#f8fafc',
  accentBronze: '#b45309',
  surfaceGlass: 'rgba(255, 255, 255, 0.7)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.85)',
  surfaceGlassPanel: 'rgba(255, 255, 255, 0.9)',
  surfaceVolume: 'rgba(255, 255, 255, 0.95)',
  traceBorder: 'rgba(79, 70, 229, 0.2)',
  accentBorder: 'rgba(79, 70, 229, 0.3)',
  accentBorderLight: 'rgba(79, 70, 229, 0.15)',
  accentSpinner: 'rgba(79, 70, 229, 0.5)',
  toolLoadingBg: 'rgba(79, 70, 229, 0.05)',
  toolLoadingBorder: 'rgba(79, 70, 229, 0.1)',
  progressFill: 'rgba(79, 70, 229, 0.8)',
  errorDeep: '#991b1b',
  diffInsert: '#059669',
  diffDelete: '#dc2626',
  diffInsertBg: 'rgba(16, 185, 129, 0.1)',
  diffDeleteBg: 'rgba(239, 68, 68, 0.1)',
  surfaceFrosted: 'rgba(255, 255, 255, 0.8)',
  surfaceFrostedStrong: 'rgba(255, 255, 255, 0.95)',
  accentHighlight: '#818cf8',
  planningActiveBg: '#f8fafc',
  traceShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  scrollbarThumb: '#cbd5e1',
  scrollbarThumbHover: '#94a3b8',
  scrollbarThumbAlt: '#e2e8f0',
  cubeText: '#1e293b',
  cubeTextDark: '#0f172a',
  errorUser: '#b91c1c',
  memoryBrown: '#b45309',
  bannerHost: '#4f46e5',
  bannerRecovering: '#4338ca',
} as const

export const shadow = {
  out: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
  outSm: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`,
  outMd: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
  outMdHover: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`,
  outLg: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`,
  outSoft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
  in: `inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)`,
  inSoft: `inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)`,
  inBadge: `inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)`,
  inStats: `inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)`,
  inInput: `inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)`,
  inInputFocus: `0 0 0 2px rgba(79, 70, 229, 0.2)`,
  inDot: `inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)`,
  inPressed: `inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)`,
  menu: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`,
  cardHero: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`,
  cardAuth: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`,
  cardStep: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
  window: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`,
} as const

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  xxl: '1.5rem',
  pill: '9999px',
  round: '50%',
} as const

import { font } from './fonts'

export { font }

export const space = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const

export const transition = {
  fast: '150ms ease',
  base: '0.25s ease',
  morph: '0.38s cubic-bezier(0.4, 0, 0.2, 1)',
} as const

/** 可滚动但不显示滚动条（侧栏、聊天区等） */
export const hideScrollbarCss = `
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
`

/** 编辑器顶栏、侧栏、主区水平对齐 */
export const editorLayout = {
  mainPaddingX: '1.25rem',
  sidebarPaddingX: '1rem',
  sidebarWidthPx: 284,
  chromeMinHeight: '52px',
  contentMaxWidth: '768px',
} as const

/** 弹层 / 浮层表面（与 StoryMemoryModal 一致） */
export const editorModalSurface = {
  overlay: palette.overlay,
  overlayBlur: 'blur(4px)',
  dialogBg: 'linear-gradient(165deg, #f3f3f3 0%, #e8e8e8 48%, #e0e0e0 100%)',
  dialogShadow: '0 24px 64px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
  floatBg: 'linear-gradient(165deg, #f2f2f2 0%, #ebebeb 55%, #e6e6e6 100%)',
  floatShadow: '0 14px 36px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.58)',
  menuShadow: shadow.menu,
} as const

/** @deprecated 使用 theme / palette；保留以兼容现有 import */
export const editorTheme = {
  bg: palette.bg,
  bgSidebar: palette.bgSidebar,
  bgElevated: palette.bgElevated,
  bgHover: palette.bgHover,
  border: palette.border,
  borderStrong: palette.borderStrong,
  text: palette.text,
  textSecondary: palette.textSecondary,
  textMuted: palette.textMuted,
  accent: palette.accent,
  accentMuted: palette.accentMuted,
  accentSoft: palette.accentSoft,
  activeBg: palette.activeBg,
  error: palette.error,
  errorBg: palette.errorBg,
  shadowOut: shadow.out,
  shadowOutSoft: shadow.outSoft,
  shadowIn: shadow.in,
  shadowInSoft: shadow.inSoft,
  shadowMenu: shadow.menu,
  radiusSm: radius.sm,
  radiusMd: radius.md,
  radiusLg: radius.lg,
  transition: transition.base,
  transitionMorph: transition.morph,
  composerControlHeight: 32,
} as const

export const theme = {
  palette,
  shadow,
  radius,
  font,
  space,
  transition,
  layout: editorLayout,
  modal: editorModalSurface,
  colors: editorTheme,
} as const

export { typography, textStyle, sectionHeadingCss, sectionSubheadingCss } from './typography'
export type { TypographyVariant } from './typography'

export type AppTheme = typeof theme

/** 登录按钮等多色强调 */
export const brandAccent = {
  yellow: palette.accent,
  blue: palette.brandBlue,
  red: palette.brandRed,
  green: palette.brandGreen,
  orange: palette.brandOrange,
  purple: palette.brandPurple,
} as const
