import { cn } from '@/lib/utils'

export const CHAPTER_VERSION_PANEL = cn(
  'mt-[0.85rem] rounded-[10px] border border-border bg-white/90 p-[0.65rem]',
)

export function chapterVersionChevronClass(open: boolean) {
  return cn(
    'inline-block text-slate-400 transition-transform duration-200 ease-out',
    open && 'rotate-180',
  )
}

export const CHAPTER_VERSION_HINT =
  'px-[0.15rem] py-2 text-[0.78rem] leading-normal text-slate-400'

export const CHAPTER_VERSION_LIST = cn(
  'mt-[0.35rem] flex max-h-[360px] flex-col gap-2 overflow-y-auto',
  'max-md:max-h-60 max-md:gap-1.5',
)

export const CHAPTER_VERSION_ITEM = cn(
  'rounded-lg border border-border bg-background p-[0.55rem] px-[0.65rem]',
  'max-md:p-2 max-md:px-2',
)

export const CHAPTER_VERSION_META = cn(
  'flex flex-wrap items-center gap-x-2 gap-y-[0.35rem] text-[0.68rem] text-slate-500',
  '[&_.badge]:rounded [&_.badge]:bg-primary [&_.badge]:px-[0.35rem] [&_.badge]:py-0.5',
  '[&_.badge]:font-semibold [&_.badge]:text-foreground',
)

export const CHAPTER_VERSION_TITLE = cn(
  'my-1 mb-[0.4rem] text-[0.8rem] font-semibold leading-snug text-slate-600',
  'max-md:line-clamp-2 max-md:overflow-hidden max-md:whitespace-normal',
  'md:truncate md:whitespace-nowrap',
)

export const CHAPTER_VERSION_ACTIONS = cn(
  'flex gap-[0.4rem]',
  'max-md:flex-col max-md:gap-[0.3rem] max-md:[&_button]:w-full max-md:[&_button]:justify-center',
)
