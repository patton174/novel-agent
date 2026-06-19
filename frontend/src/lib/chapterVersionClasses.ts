import { cn } from '@/lib/utils'

export const CHAPTER_VERSION_PANEL = cn('flex min-h-0 flex-col')

export const CHAPTER_VERSION_HEADING = cn(
  'mb-2 px-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80',
)

export const CHAPTER_VERSION_HINT =
  'px-0.5 py-1.5 text-[0.74rem] leading-snug text-muted-foreground'

export const CHAPTER_VERSION_TIMELINE = cn('flex flex-col')

export const CHAPTER_VERSION_ITEM = cn('flex gap-x-2.5')

export const CHAPTER_VERSION_RAIL = cn('flex w-[14px] shrink-0 flex-col items-center')

export function chapterVersionDotClass(opts: { current?: boolean; active?: boolean }) {
  return cn(
    'relative z-[1] mt-[0.22rem] size-[9px] shrink-0 rounded-full border-2',
    opts.current
      ? 'border-primary bg-primary shadow-[0_0_0_2px] shadow-background'
      : 'border-muted-foreground/55 bg-background',
    opts.active && !opts.current && 'border-primary/70 bg-primary/15',
  )
}

export const CHAPTER_VERSION_CONNECTOR = cn(
  'my-1 w-px min-h-[10px] flex-1 bg-border/70',
)

export const CHAPTER_VERSION_BODY = cn('min-w-0 flex-1 pb-3 last:pb-0')

export const CHAPTER_VERSION_META = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.66rem] text-muted-foreground',
  '[&_.badge]:rounded [&_.badge]:bg-muted/60 [&_.badge]:px-1.5 [&_.badge]:py-px',
  '[&_.badge]:font-medium [&_.badge]:text-muted-foreground',
)

export const CHAPTER_VERSION_TITLE = cn(
  'mt-0.5 truncate text-[0.78rem] font-medium leading-snug text-foreground',
)

export const CHAPTER_VERSION_ACTIONS = cn(
  'mt-1.5 flex flex-wrap gap-1',
  '[&_button]:h-7 [&_button]:px-2 [&_button]:text-[0.68rem]',
)
