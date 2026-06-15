import { cn } from '@/lib/utils'

export const OUTLINE_CHAPTER_LIST_INNER =
  'flex flex-col gap-[0.35rem] overflow-hidden'

export const OUTLINE_DRAG_HINT =
  'mb-2 rounded-md border border-border/60 bg-muted/25 px-2 py-1.5 text-[0.68rem] font-medium leading-snug text-muted-foreground'

export const OUTLINE_SECTION_LABEL =
  'mb-1.5 px-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80'

export const OUTLINE_SECTION_DIVIDER = 'my-3 border-t border-border/70'

export const OUTLINE_HINT =
  'px-[0.15rem] py-2 text-[0.74rem] font-medium leading-snug text-muted-foreground'

export const OUTLINE_LIST = 'flex flex-1 flex-col gap-[0.65rem] overflow-y-auto'

export function outlineChapterListCollapsibleClass(open: boolean) {
  return cn(
    'grid transition-[grid-template-rows] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
  )
}

export function outlineVolumeBlockClass(dragOver?: boolean) {
  return cn(
    'flex flex-col gap-1 rounded-xl border p-2 shadow-sm',
    'transition-[background,border-color,box-shadow] duration-150',
    dragOver
      ? 'border-primary/40 bg-primary/10 shadow-md'
      : 'border-border/70 bg-muted/20',
  )
}

export const OUTLINE_VOLUME_HEADER = 'flex items-center gap-1'

export const OUTLINE_DRAG_HANDLE = cn(
  'inline-flex w-[1.1rem] shrink-0 cursor-grab select-none items-center justify-center',
  'text-[0.68rem] font-medium tracking-tighter text-muted-foreground/70 active:cursor-grabbing',
)

export function outlineChevronWrapClass(open: boolean) {
  return cn(
    'inline-flex text-muted-foreground transition-transform duration-200',
    open && 'rotate-180',
    '[&_svg]:size-3.5',
  )
}

export function outlineChapterDropZoneClass(dragOver?: boolean) {
  return cn(
    'rounded-lg border border-dashed p-[0.65rem] text-center text-[0.74rem] font-medium text-muted-foreground',
    dragOver ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
  )
}

export function outlineItemClass(opts?: {
  active?: boolean
  inProgress?: boolean
  dragOver?: boolean
}) {
  const { active, inProgress, dragOver } = opts ?? {}
  return cn(
    'rounded-lg border border-transparent transition-[background,border-color,box-shadow] duration-150',
    dragOver && 'border-primary/30 bg-primary/10',
    !dragOver && active && 'relative overflow-hidden border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/15',
    !dragOver &&
      !active &&
      inProgress &&
      'border-border/50 bg-muted/40',
    !dragOver && !active && !inProgress && 'bg-transparent',
  )
}

export const OUTLINE_CHAPTER_ACTIVE_GRADIENT =
  'pointer-events-none absolute inset-y-0 right-0 z-[1] w-[5.5rem] rounded-r-lg bg-gradient-to-l from-background from-35% via-background/80 to-transparent'

export function outlineChapterActionsClass(active?: boolean) {
  return cn(
    'relative z-[2] flex shrink-0 items-center gap-1 pr-1',
    active
      ? 'opacity-100'
      : 'opacity-0 transition-opacity group-hover/chapter:opacity-100 group-focus-within/chapter:opacity-100',
  )
}

export const OUTLINE_CHAPTER_ACTION_BTN =
  'size-7 shrink-0 rounded-lg border border-border/70 bg-background/95 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-primary/25 hover:bg-primary/8 hover:text-foreground'

export const OUTLINE_CHAPTER_ACTION_BTN_DANGER =
  'size-7 shrink-0 rounded-lg border border-border/70 bg-background/95 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive'


export const OUTLINE_CHAPTER_ROW = 'flex items-stretch gap-[0.2rem]'
