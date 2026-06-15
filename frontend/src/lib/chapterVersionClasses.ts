import { cn } from '@/lib/utils'

export const CHAPTER_VERSION_PANEL = cn(
  'mt-[0.85rem] rounded-[10px] border border-border bg-card/90 p-[0.65rem]',
)

export const CHAPTER_VERSION_HEADING = cn(
  'mb-2 text-[0.82rem] font-bold text-foreground',
)

export const CHAPTER_VERSION_HINT =
  'px-[0.15rem] py-2 text-[0.78rem] leading-normal text-muted-foreground'

export const CHAPTER_VERSION_TIMELINE = cn(
  'relative mt-2 pl-5',
  'before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border',
)

export const CHAPTER_VERSION_ITEM = cn(
  'relative pb-4 last:pb-0',
  'before:absolute before:-left-[13px] before:top-[0.55rem] before:size-2.5 before:rounded-full',
  'before:border-2 before:border-primary before:bg-background',
)

export const CHAPTER_VERSION_BODY = cn(
  'rounded-lg border border-border bg-background p-[0.55rem] px-[0.65rem]',
  'max-md:p-2 max-md:px-2',
)

export const CHAPTER_VERSION_META = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-[0.35rem] text-[0.68rem] text-muted-foreground',
  '[&_.badge]:rounded [&_.badge]:bg-primary/15 [&_.badge]:px-[0.35rem] [&_.badge]:py-0.5',
  '[&_.badge]:font-semibold [&_.badge]:text-primary',
)

export const CHAPTER_VERSION_TITLE = cn(
  'my-1 mb-[0.4rem] text-[0.8rem] font-semibold leading-snug text-foreground',
  'max-md:line-clamp-2 max-md:overflow-hidden max-md:whitespace-normal',
  'md:truncate md:whitespace-nowrap',
)

export const CHAPTER_VERSION_ACTIONS = cn(
  'flex gap-[0.4rem]',
  'max-md:flex-col max-md:gap-[0.3rem] max-md:[&_button]:w-full max-md:[&_button]:justify-center',
)
