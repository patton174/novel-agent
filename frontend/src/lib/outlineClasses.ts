import { cn } from '@/lib/utils'
import {
  editorPixelOutlineItemClass,
  editorPixelVolumeBlockClass,
  EDITOR_PIXEL_DIVIDER,
} from '@/lib/editorPixelClasses'

export const OUTLINE_CHAPTER_LIST_INNER =
  'flex min-h-0 flex-col gap-[0.35rem] overflow-hidden'

export const OUTLINE_DRAG_HINT = cn(
  'mb-2 border-2 border-foreground bg-muted/30 px-2 py-1.5 font-mono text-[0.68rem] font-bold uppercase leading-snug text-muted-foreground',
)

export const OUTLINE_SECTION_LABEL =
  'mb-1.5 px-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground'

export const OUTLINE_SECTION_DIVIDER = EDITOR_PIXEL_DIVIDER

export const OUTLINE_HINT =
  'px-[0.15rem] py-2 font-mono text-[0.74rem] font-medium leading-snug text-muted-foreground'

export const OUTLINE_LIST = 'flex flex-col gap-[0.65rem]'

export function outlineChapterListCollapsibleClass(open: boolean) {
  return cn(
    'grid transition-[grid-template-rows] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
  )
}

export function outlineVolumeBlockClass(dragOver?: boolean) {
  return editorPixelVolumeBlockClass(dragOver)
}

export const OUTLINE_VOLUME_HEADER = 'flex items-center gap-1'

export const OUTLINE_DRAG_HANDLE = cn(
  'inline-flex w-[1.1rem] shrink-0 cursor-grab select-none items-center justify-center',
  'font-mono text-[0.68rem] font-bold tracking-tighter text-muted-foreground active:cursor-grabbing',
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
    'border-2 border-dashed p-[0.65rem] text-center font-mono text-[0.74rem] font-medium text-muted-foreground',
    dragOver ? 'border-foreground bg-neon/25' : 'border-foreground/40 bg-transparent',
  )
}

export function outlineItemClass(opts?: {
  active?: boolean
  inProgress?: boolean
  dragOver?: boolean
}) {
  const { active, inProgress, dragOver } = opts ?? {}
  return cn(
    editorPixelOutlineItemClass({ active, dragOver }),
    !dragOver && !active && inProgress && 'border-foreground/30 bg-muted/25',
  )
}

export const OUTLINE_CHAPTER_ACTIVE_GRADIENT =
  'pointer-events-none absolute inset-y-0 right-0 z-[1] w-[5.5rem] bg-gradient-to-l from-neon/30 from-35% via-neon/10 to-transparent'

export function outlineChapterActionsClass(active?: boolean) {
  return cn(
    'relative z-[2] flex shrink-0 items-center gap-1 pr-1',
    active
      ? 'opacity-100'
      : 'opacity-0 transition-opacity group-hover/chapter:opacity-100 group-focus-within/chapter:opacity-100',
  )
}

export const OUTLINE_CHAPTER_ACTION_BTN = cn(
  'size-7 shrink-0 border-2 border-foreground bg-background font-mono text-muted-foreground shadow-soft',
  'hover:bg-neon/30 hover:text-foreground',
)

export const OUTLINE_CHAPTER_ACTION_BTN_DANGER = cn(
  'size-7 shrink-0 border-2 border-foreground bg-background font-mono text-muted-foreground shadow-soft',
  'hover:border-destructive hover:bg-destructive/10 hover:text-destructive',
)

export const OUTLINE_CHAPTER_ROW = 'flex items-stretch gap-[0.2rem]'
