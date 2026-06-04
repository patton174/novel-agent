/**
 * 全站设计令牌（浅色新拟态）。CSS 变量见 globals.css，需保持数值一致。
 */
export const palette = {
  bg: '#e8e8e8',
  bgPage: '#f0f0f0',
  bgSidebar: '#e0e0e0',
  bgElevated: '#f0f0f0',
  bgHover: '#d8d8d8',
  bgInset: '#d0d0d0',
  ink: '#1a1a1a',
  inkSoft: '#1f1f1f',
  inkHover: '#333333',
  text: '#1a1a1a',
  textBody: '#2c2c2c',
  textSecondary: '#555555',
  textMuted: '#888888',
  textFaint: '#999999',
  textSubtle: '#777777',
  textDim: '#666666',
  textPlaceholder: '#bbbbbb',
  textThink: '#7a7a7a',
  textThinkHeading: '#6a6a6a',
  accent: '#e9b50b',
  accentHover: '#d4a00a',
  accentDark: '#8a6d12',
  accentMuted: 'rgba(233, 181, 11, 0.18)',
  accentSoft: 'rgba(233, 181, 11, 0.12)',
  accentGhost: 'rgba(233, 181, 11, 0.15)',
  accentLine: 'rgba(233, 181, 11, 0.75)',
  accentLineSoft: 'rgba(233, 181, 11, 0.55)',
  accentLineFaint: 'rgba(233, 181, 11, 0.35)',
  accentGlow: 'rgba(233, 181, 11, 0.5)',
  accentDeep: '#c9a030',
  traceOk: '#5a9a6e',
  activeBg: 'rgba(233, 181, 11, 0.22)',
  error: '#c45c5c',
  errorBright: '#c0392b',
  errorInput: '#ff6b6b',
  errorBg: 'rgba(196, 92, 92, 0.12)',
  success: '#7fba00',
  successBright: '#27ae60',
  warning: '#d68910',
  brandBlue: '#00a4ef',
  brandGreen: '#7fba00',
  brandRed: '#f25022',
  brandOrange: '#ffb900',
  brandPurple: '#9b59b6',
  border: 'rgba(0, 0, 0, 0.08)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',
  borderTable: 'rgba(0, 0, 0, 0.12)',
  overlay: 'rgba(18, 18, 18, 0.42)',
  chrome: '#2a2a2a',
  codeBg: '#1a1a1a',
  white: '#ffffff',
  black: '#000000',
  shadowDark: '#c5c5c5',
  shadowLight: '#ffffff',
  shadowMid: '#c8c8c8',
  shadowSoft: '#bebebe',
  divider: '#c0c0c0',
  footerDot: '#cccccc',
  surfaceAlpha: 'rgba(240, 240, 240, 0.85)',
  codeText: '#e0e0e0',
  proseMuted: '#444444',
  proseCodeBg: 'rgba(0, 0, 0, 0.06)',
  proseCodeBgBlock: 'rgba(0, 0, 0, 0.05)',
  proseTableHead: 'rgba(0, 0, 0, 0.05)',
  proseTableStripe: 'rgba(0, 0, 0, 0.02)',
  proseBlockquoteBg: 'rgba(233, 181, 11, 0.06)',
  proseThinkBg: 'rgba(0, 0, 0, 0.02)',
  accentBronze: '#b8860b',
  surfaceGlass: 'rgba(255, 255, 255, 0.35)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.42)',
  surfaceGlassPanel: 'rgba(255, 255, 255, 0.55)',
  surfaceVolume: 'rgba(255, 255, 255, 0.35)',
  traceBorder: 'rgba(233, 181, 11, 0.25)',
  accentBorder: 'rgba(233, 181, 11, 0.38)',
  accentBorderLight: 'rgba(233, 181, 11, 0.35)',
  accentSpinner: 'rgba(233, 181, 11, 0.25)',
  toolLoadingBg: 'rgba(233, 181, 11, 0.06)',
  toolLoadingBorder: 'rgba(233, 181, 11, 0.18)',
  progressFill: 'rgba(233, 181, 11, 0.85)',
  errorDeep: '#a93226',
  diffInsert: '#1f7a3f',
  diffDelete: '#a33',
  diffInsertBg: 'rgba(31, 122, 63, 0.12)',
  diffDeleteBg: 'rgba(163, 51, 51, 0.12)',
  surfaceFrosted: 'rgba(255, 255, 255, 0.65)',
  surfaceFrostedStrong: 'rgba(255, 255, 255, 0.72)',
  accentHighlight: '#f0d060',
  planningActiveBg: 'linear-gradient(165deg, #f2f2f2 0%, #ececec 100%)',
  traceShadow: '2px 2px 8px rgba(0, 0, 0, 0.04)',
  scrollbarThumb: '#c5c5c5',
  scrollbarThumbHover: '#b0b0b0',
  scrollbarThumbAlt: '#c0c0c0',
  cubeText: '#3a3208',
  cubeTextDark: '#2a2410',
  errorUser: '#8b2500',
  memoryBrown: '#6b4e00',
  bannerHost: '#7a5f08',
  bannerRecovering: '#92400e',
} as const

export const shadow = {
  out: `4px 4px 10px ${palette.shadowDark}, -4px -4px 10px ${palette.shadowLight}`,
  outSm: `3px 3px 8px ${palette.shadowDark}, -3px -3px 8px ${palette.shadowLight}`,
  outMd: `6px 6px 16px ${palette.shadowDark}, -6px -6px 16px ${palette.shadowLight}`,
  outMdHover: `8px 8px 20px ${palette.shadowSoft}, -8px -8px 20px ${palette.shadowLight}`,
  outLg: `8px 8px 20px ${palette.shadowMid}, -8px -8px 20px ${palette.shadowLight}`,
  outSoft: '0 4px 12px rgba(0, 0, 0, 0.08)',
  in: `inset 2px 2px 5px rgba(0, 0, 0, 0.08), inset -1px -1px 4px rgba(255, 255, 255, 0.45)`,
  inSoft: `inset 1px 1px 3px rgba(0, 0, 0, 0.06), inset -1px -1px 2px rgba(255, 255, 255, 0.4)`,
  inBadge: `inset 2px 2px 4px ${palette.bgInset}, inset -2px -2px 4px #f8f8f8`,
  inStats: `inset 4px 4px 8px ${palette.bgInset}, inset -4px -4px 8px #f8f8f8`,
  inInput: `inset 4px 4px 8px ${palette.shadowDark}, inset -4px -4px 8px ${palette.shadowLight}`,
  inInputFocus: `inset 6px 6px 12px #c0c0c0, inset -6px -6px 12px ${palette.shadowLight}`,
  inDot: `inset 2px 2px 4px #b0b0b0, inset -2px -2px 4px ${palette.bgElevated}`,
  inPressed: `inset 3px 3px 6px #c0c0c0, inset -3px -3px 6px ${palette.shadowLight}`,
  menu: `0 12px 28px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.52)`,
  cardHero: `24px 24px 48px ${palette.shadowMid}, -24px -24px 48px ${palette.shadowLight}`,
  cardAuth: `20px 20px 60px ${palette.shadowSoft}, -20px -20px 60px ${palette.shadowLight}`,
  cardStep: `8px 8px 20px ${palette.shadowMid}, -8px -8px 20px ${palette.shadowLight}`,
  window: `12px 12px 30px #b0b0b0, -12px -12px 30px ${palette.shadowLight}`,
} as const

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  pill: '32px',
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
