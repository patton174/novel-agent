import { cn } from '@/lib/utils'

/** Cursor 官网近似色板 */
export const cursorTheme = {
  bg: 'var(--background)',
  card: 'var(--card)',
  cardElevated: 'var(--card)',
  text: 'var(--foreground)',
  textMuted: 'var(--muted-foreground)',
  textFaint: '#94a3b8',
  accent: 'var(--primary)',
  accentHover: 'var(--color-primary-hover)',
  accentText: 'var(--primary-foreground)',
  border: 'var(--border)',
  borderStrong: '#cbd5e1',
  green: 'var(--color-success)',
  greenBg: 'rgba(16, 185, 129, 0.12)',
  red: 'var(--color-danger)',
  redBg: 'rgba(239, 68, 68, 0.1)',
  blue: '#3b82f6',
  blueBg: 'rgba(59, 130, 246, 0.12)',
  shadow:
    '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  shadowSm: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
} as const

export const CURSOR_LANDING_ROOT = cn('w-full bg-background')

export const CURSOR_FEATURE_SECTION = cn(
  'relative w-full scroll-mt-[72px] px-6 py-20',
)

export function cursorFeatureSectionClass(wash?: boolean) {
  return cn(
    CURSOR_FEATURE_SECTION,
    wash &&
      'bg-gradient-to-b from-primary/4 from-0% to-background/0 to-[72%]',
  )
}

export const CURSOR_FEATURE_INNER = cn('mx-auto w-full max-w-[1120px]')

export function cursorFeatureGridClass(flip?: boolean) {
  return cn(
    'grid items-stretch gap-6',
    'md:grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1.1fr)] md:gap-x-8 md:gap-y-10',
    flip &&
      'md:[&_.story-copy]:order-3 md:[&_.story-timeline]:order-2 md:[&_.demo-app-mock]:order-1',
    'max-md:grid-cols-1 max-md:gap-5',
    'max-md:[&_.story-copy]:order-1 max-md:[&_.demo-app-mock]:order-2',
  )
}

export const CURSOR_FEATURE_TAG = cn(
  'mb-[0.65rem] inline-block text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted-foreground',
)

export function cursorFeatureCopyClass(alignEnd?: boolean) {
  return cn(
    'pt-6',
    alignEnd &&
      'md:pt-6 md:text-right md:[&>p]:ml-auto',
    'max-md:pt-0 max-md:text-center max-md:[&>p]:mx-auto',
  )
}

export const CURSOR_FEATURE_TITLE = cn(
  'mkt-font-display m-0 mb-4 text-[clamp(1.65rem,3.2vw,2.35rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-foreground',
)

export const CURSOR_FEATURE_BODY = cn(
  'm-0 mb-5 max-w-[22rem] text-base leading-[1.65] text-muted-foreground',
  'max-md:mx-auto',
)

export const CURSOR_FEATURE_LINK = cn(
  'inline-flex cursor-default items-center gap-[0.35rem] text-[0.92rem] font-medium text-foreground',
  "after:transition-transform after:duration-200 after:ease-in-out after:content-['→'] hover:after:translate-x-[3px]",
)

export const CURSOR_FEATURE_PIN = cn(
  'flex min-h-[calc(100vh-72px)] w-full items-center justify-center',
)

export const CURSOR_FEATURE_CARD = cn(
  'relative min-h-[420px] w-full overflow-hidden border-2 border-border bg-card',
  'shadow-soft',
)

export const CURSOR_HERO_STACK_WRAP = cn(
  'relative mx-auto mt-10 h-[clamp(420px,52vw,560px)] w-full max-w-[1060px]',
  'max-md:flex max-md:h-auto max-md:flex-col max-md:gap-4',
)

export function cursorHeroLayerClass(layer: 'back' | 'mid' | 'front') {
  return cn(
    'absolute max-md:relative max-md:!bottom-auto max-md:!left-auto max-md:!right-auto max-md:!top-auto max-md:!w-full max-md:!transform-none',
    layer === 'back' && 'left-[4%] top-[8%] z-[1] w-[58%] -rotate-1',
    layer === 'mid' && 'right-[2%] top-0 z-[2] w-[42%] rotate-[1.5deg]',
    layer === 'front' && 'bottom-0 right-[8%] z-[3] w-[38%] -rotate-[0.5deg]',
  )
}

export const CURSOR_WIN = cn(
  'absolute flex flex-col overflow-hidden border-2 border-border bg-card',
  'shadow-soft',
  'max-md:relative max-md:!left-[4%] max-md:mb-4 max-md:!w-[92%] max-md:!transform-none max-md:last:mb-0',
)

export const CURSOR_WIN_BAR = cn(
  'flex shrink-0 items-center gap-2 border-b-2 border-border bg-muted px-3 py-2',
  '[&_.dots]:flex [&_.dots]:gap-[5px]',
  '[&_.dot]:size-[9px]',
  '[&_.dot.r]:bg-punk-red [&_.dot.y]:bg-punk-yellow [&_.dot.g]:bg-success]',
  '[&_.title]:flex-1 [&_.title]:text-center [&_.title]:text-[0.68rem] [&_.title]:font-semibold [&_.title]:tracking-[0.02em] [&_.title]:text-muted-foreground',
  '[&_.url]:border [&_.url]:border-border [&_.url]:bg-background [&_.url]:px-[0.45rem] [&_.url]:py-[0.15rem] [&_.url]:text-[0.62rem] [&_.url]:text-muted-foreground',
)

export const CURSOR_WIN_BODY = cn('flex min-h-0 flex-1 overflow-hidden')

export const CURSOR_TASK_COL = cn(
  'flex w-[38%] min-w-[140px] flex-col gap-[0.28rem] border-r border-[#e2e8f0] bg-[#fafaf8] p-2 px-[0.4rem]',
)

export function cursorTaskBtnClass(state?: 'done' | 'active' | 'idle') {
  return cn(
    'flex w-full flex-col items-start gap-[0.15rem] rounded-lg border border-transparent bg-transparent p-[0.42rem_0.45rem] text-left text-[0.68rem] text-[#0f172a] will-change-[opacity,transform]',
    '[&_.row]:flex [&_.row]:w-full [&_.row]:items-center [&_.row]:gap-[0.35rem]',
    '[&_.name]:flex-1 [&_.name]:font-medium [&_.name]:leading-[1.25]',
    '[&_.time]:text-[0.6rem] [&_.time]:text-[#94a3b8]',
    '[&_.diff]:font-mono [&_.diff]:text-[0.58rem] [&_.diff]:font-semibold',
    '[&_.diff_.add]:text-[#10b981] [&_.diff_.del]:text-[#ef4444]',
    state === 'active' &&
      'border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
  )
}

export const CURSOR_AGENT_COL = cn('flex min-w-0 flex-1 flex-col bg-white')

export const CURSOR_AGENT_SCROLL = cn(
  'flex flex-1 flex-col gap-[0.55rem] overflow-hidden px-[0.7rem] pb-[0.4rem] pt-[0.65rem]',
)

export const CURSOR_USER_PROMPT = cn(
  'text-[0.78rem] leading-[1.5] text-[#0f172a] will-change-[opacity,transform]',
)

export const CURSOR_THINKING = cn(
  'flex items-center gap-[0.35rem] text-[0.72rem] font-medium text-[#64748b] will-change-[opacity]',
  '[&_.dot]:mkt-cursor-thinking-dot size-1.5 rounded-full bg-[#64748b]',
)

export const CURSOR_AGENT_LIST = cn(
  'm-0 list-disc pl-4 text-[0.72rem] leading-[1.55] text-[#64748b]',
  '[&_li]:mb-[0.2rem] [&_li]:will-change-[opacity,transform]',
)

export const CURSOR_AGENT_NARRATIVE = cn(
  'm-0 text-[0.74rem] leading-[1.55] text-[#0f172a] will-change-[opacity,transform]',
)

export const CURSOR_FILE_CHIP = cn(
  'inline-flex items-center gap-[0.35rem] rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-[0.28rem] font-mono text-[0.66rem] will-change-[opacity,transform]',
  '[&_.badge]:rounded-[3px] [&_.badge]:bg-[#e2e8f0] [&_.badge]:px-1 [&_.badge]:py-[0.1rem] [&_.badge]:text-[0.58rem] [&_.badge]:font-bold [&_.badge]:text-[#64748b]',
  '[&_.add]:font-semibold [&_.add]:text-[#10b981]',
  '[&_.del]:font-semibold [&_.del]:text-[#ef4444]',
)

export const CURSOR_COMPOSER = cn(
  'flex items-center gap-[0.4rem] border-t border-[#e2e8f0] px-[0.55rem] pb-[0.55rem] pt-[0.45rem]',
  '[&_.input]:flex-1 [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-[#e2e8f0] [&_.input]:bg-[#f8fafc] [&_.input]:px-2 [&_.input]:py-[0.4rem] [&_.input]:text-[0.68rem] [&_.input]:text-[#94a3b8]',
  '[&_.pill]:whitespace-nowrap [&_.pill]:rounded-md [&_.pill]:border [&_.pill]:border-[#e2e8f0] [&_.pill]:px-[0.4rem] [&_.pill]:py-[0.22rem] [&_.pill]:text-[0.62rem] [&_.pill]:font-semibold [&_.pill]:text-[#64748b]',
  '[&_.send]:size-[26px] [&_.send]:shrink-0 [&_.send]:rounded-md [&_.send]:bg-[#0f172a]',
)

export const CURSOR_TABS = cn(
  'flex items-center gap-1 overflow-hidden border-b border-[#e2e8f0] px-2 pb-0 pt-[0.35rem]',
)

export function cursorTabClass(active?: boolean) {
  return cn(
    '-mb-px flex items-center gap-[0.3rem] rounded-t-md border border-transparent border-b-0 px-[0.55rem] py-[0.35rem] font-mono text-[0.65rem] text-[#64748b]',
    active && 'border-[#e2e8f0] bg-white font-semibold text-[#0f172a]',
  )
}

export const CURSOR_DOC_PANE = cn(
  'flex-1 overflow-hidden p-[0.65rem_0.75rem] text-[0.72rem] leading-[1.6] text-[#0f172a]',
  '[&_h4]:m-0 [&_h4]:mb-2 [&_h4]:text-[0.74rem] [&_h4]:font-bold [&_h4]:leading-[1.45]',
  '[&_p]:m-0 [&_p]:mb-[0.45rem] [&_p]:text-[#64748b]',
  '[&_.hl]:rounded-sm [&_.hl]:bg-[rgba(59,130,246,0.12)] [&_.hl]:px-0.5 [&_.hl]:text-[#0f172a] [&_.hl]:outline [&_.hl]:outline-1 [&_.hl]:outline-[rgba(59,130,246,0.25)]',
)

export const CURSOR_STATUS_LINE = cn(
  'flex items-center gap-[0.4rem] text-[0.7rem] text-[#64748b] will-change-[opacity,transform]',
  '[&_.ok]:font-semibold [&_.ok]:text-[#10b981]',
)

export const CURSOR_SUMMARY_CARD = cn(
  'rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-[0.55rem_0.6rem] will-change-[opacity,transform]',
  '[&_.label]:mb-[0.35rem] [&_.label]:text-[0.62rem] [&_.label]:font-bold [&_.label]:uppercase [&_.label]:tracking-[0.06em] [&_.label]:text-[#94a3b8]',
  '[&_.text]:text-[0.72rem] [&_.text]:leading-[1.5] [&_.text]:text-[#64748b]',
)

/* ── Story copy (MarketingStoryCopy) ── */

export const STORY_COPY_BLOCK = cn('w-full max-w-[21rem] overflow-visible text-left md:max-w-[28rem]')

export const STORY_POINT_LIST = cn('m-0 flex list-none flex-col gap-2 p-0')

export const STORY_POINT_HIGHLIGHT = cn(
  'inline-flex shrink-0 items-center border-2 border-foreground bg-neon/40 px-1.5 py-0.5 font-mono text-[0.72rem] font-bold leading-tight text-ink',
  'sm:text-[0.78rem]',
)

export const STORY_POINT_ITEM = cn(
  'flex flex-wrap items-baseline gap-x-1.5 gap-y-1 font-mono text-[0.86rem] leading-[1.55] text-foreground/90 sm:text-[0.88rem]',
)

export function storyCopyRootClass(_alignEnd?: boolean) {
  return cn(
    'w-full pt-5',
    'max-md:flex max-md:flex-col max-md:items-center max-md:pt-0',
    'max-md:[&_.story-copy-block]:max-w-[20rem]',
  )
}

export const STORY_ACT_ROW = cn(
  'mb-[1.1rem] inline-flex items-center gap-[0.65rem]',
)

export const STORY_ACT_INDEX = cn(
  'inline-flex h-8 min-w-8 items-center justify-center border-2 border-foreground bg-neon px-[0.45rem] text-ink',
)

export const STORY_ACT_LABEL = cn(
  'font-mono text-[0.72rem] font-bold uppercase tracking-[0.14em] text-muted-foreground',
)

/** PixelText 标题容器（衬线 STORY_TITLE 已废弃，保留 spacing wrapper） */
export const STORY_TITLE = cn(
  'm-0 mb-[0.85rem] flex flex-col gap-1 leading-none',
)

export const STORY_TITLE_ACCENT = cn(
  'mt-0.5',
)

export const STORY_LEAD = cn(
  'm-0 mb-[1.35rem] font-mono text-[0.95rem] leading-[1.68] text-muted-foreground sm:text-[1.02rem]',
)
