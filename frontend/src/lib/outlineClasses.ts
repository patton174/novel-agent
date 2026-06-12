import { cn } from '@/lib/utils'

export const OUTLINE_CHAPTER_LIST_INNER =
  'flex flex-col gap-[0.35rem] overflow-hidden'

export const OUTLINE_DRAG_HINT =
  'mb-[0.45rem] text-[0.68rem] font-medium leading-snug text-slate-400'

export const OUTLINE_HINT =
  'px-[0.15rem] py-2 text-[0.74rem] font-medium leading-snug text-slate-400'

export const OUTLINE_LIST = 'flex flex-1 flex-col gap-[0.65rem] overflow-y-auto'

export function outlineChapterListCollapsibleClass(open: boolean) {
  return cn(
    'grid transition-[grid-template-rows] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
  )
}

export function outlineVolumeBlockClass(dragOver?: boolean) {
  return cn(
    'flex flex-col gap-[0.35rem] rounded-[10px] border p-[0.45rem]',
    'transition-[background,border-color] duration-150',
    dragOver
      ? 'border-primary/30 bg-primary/10'
      : 'border-border bg-white/95',
  )
}

export const OUTLINE_VOLUME_HEADER = 'flex items-center gap-1'

export const OUTLINE_DRAG_HANDLE = cn(
  'inline-flex w-[1.1rem] cursor-grab select-none items-center justify-center',
  'text-[0.68rem] font-medium tracking-tighter text-slate-400 active:cursor-grabbing',
)

export function outlineChevronWrapClass(open: boolean) {
  return cn(
    'inline-flex text-slate-400 transition-transform duration-200',
    open && 'rotate-180',
    '[&_svg]:size-3.5',
  )
}

export function outlineChapterDropZoneClass(dragOver?: boolean) {
  return cn(
    'rounded-lg border border-dashed p-[0.65rem] text-center text-[0.74rem] font-medium text-slate-400',
    dragOver ? 'border-primary bg-primary/5' : 'border-slate-300 bg-transparent',
  )
}

export function outlineItemClass(opts?: {
  active?: boolean
  inProgress?: boolean
  dragOver?: boolean
}) {
  const { active, inProgress, dragOver } = opts ?? {}
  return cn(
    'rounded-[10px] transition-[background] duration-150',
    dragOver && 'bg-primary/8',
    !dragOver && active && 'bg-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15),inset_-1px_-1px_3px_rgba(255,255,255,0.3)]',
    !dragOver &&
      !active &&
      inProgress &&
      'bg-slate-50 shadow-[2px_2px_5px_rgba(0,0,0,0.08),-1px_-1px_3px_rgba(255,255,255,0.5)]',
    !dragOver && !active && !inProgress && 'bg-transparent shadow-none',
  )
}

export const OUTLINE_CHAPTER_ROW = 'flex items-stretch gap-[0.2rem]'
