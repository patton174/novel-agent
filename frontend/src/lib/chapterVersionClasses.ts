import { cn } from '@/lib/utils'
import { OUTLINE_CHAPTER_ACTION_BTN } from '@/lib/outlineClasses'

export const CHAPTER_VERSION_PANEL = cn('flex min-h-0 flex-col')

export const CHAPTER_VERSION_HEADING = cn(
  'mb-2 px-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80',
)

export const CHAPTER_VERSION_HINT =
  'px-0.5 py-1.5 text-[0.74rem] leading-snug text-muted-foreground'

export const CHAPTER_VERSION_TIMELINE = cn('flex flex-col')

/** 圆点与标题同一 flex 行；竖线在圆点上下断开，不穿过圆点 */
export const CHAPTER_VERSION_ITEM = cn('relative')

export const CHAPTER_VERSION_STEM_ABOVE = cn(
  'pointer-events-none absolute left-[4.5px] w-px -translate-x-1/2 bg-border/70',
  'top-0 h-[max(0px,calc(var(--version-dot-center-y,0px)-4.5px))]',
)

export const CHAPTER_VERSION_STEM_BELOW = cn(
  'pointer-events-none absolute bottom-0 left-[4.5px] w-px -translate-x-1/2 bg-border/70',
  'top-[calc(var(--version-dot-center-y,0px)+4.5px)]',
)

export function chapterVersionDotClass(opts: { current?: boolean; active?: boolean }) {
  return cn(
    'relative z-[2] size-[9px] shrink-0 rounded-full border-2',
    opts.current
      ? 'border-primary bg-primary'
      : 'border-muted-foreground/55 bg-background',
    opts.active && !opts.current && 'border-primary/70 bg-primary/15',
  )
}

export const CHAPTER_VERSION_BODY = cn('min-w-0 pb-2.5 last:pb-0')

/** 圆点 + 标题 + 操作同一行，items-center 保证垂直居中 */
export const CHAPTER_VERSION_HEADER_ROW = cn(
  'flex min-w-0 items-center gap-1.5',
)

export const CHAPTER_VERSION_TITLE = cn(
  'min-w-0 flex-1 text-[0.78rem] font-semibold leading-none text-foreground',
)

/** 与标题文字左缘对齐（跳过圆点 + gap） */
export const CHAPTER_VERSION_INDENT = cn('pl-[calc(9px+0.375rem)]')

export const CHAPTER_VERSION_EXCERPT = cn(
  'mt-0.5 line-clamp-2 text-[0.68rem] leading-snug text-muted-foreground',
)

export const CHAPTER_VERSION_META = cn(
  'mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.64rem] text-muted-foreground',
  '[&_.badge]:rounded [&_.badge]:bg-muted/60 [&_.badge]:px-1.5 [&_.badge]:py-px',
  '[&_.badge]:font-medium [&_.badge]:text-muted-foreground',
  '[&_.time]:whitespace-nowrap',
  '[&_.words]:whitespace-nowrap',
)

export const CHAPTER_VERSION_ACTIONS = cn('flex shrink-0 items-center gap-0.5')

export const CHAPTER_VERSION_ICON_BTN = OUTLINE_CHAPTER_ACTION_BTN
