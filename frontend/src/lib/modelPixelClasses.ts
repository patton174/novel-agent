import { cn } from '@/lib/utils'
import {
  EDITOR_PIXEL_CARD,
  EDITOR_PIXEL_INPUT,
  editorPixelButtonClass,
  editorPixelTabClass,
} from '@/lib/editorPixelClasses'

/** 模型 UI 像素风格（布局参考 cc-switch，视觉对齐 editor-pixel） */

export const MODEL_PIXEL_SECTION = cn(EDITOR_PIXEL_CARD, 'p-3')
export const MODEL_PIXEL_ROW = cn(EDITOR_PIXEL_CARD, 'flex items-center justify-between gap-4 p-3')

export const MODEL_PIXEL_LABEL =
  'mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground'

export const MODEL_PIXEL_INPUT = EDITOR_PIXEL_INPUT

export const MODEL_PIXEL_CARD = cn(
  EDITOR_PIXEL_CARD,
  'flex flex-col gap-2 p-2.5 md:flex-row md:items-center md:justify-between md:gap-3',
)

export function modelPixelCardClass(active?: boolean, dragging?: boolean, compact?: boolean) {
  return cn(
    MODEL_PIXEL_CARD,
    'group transition-colors',
    compact && 'md:py-2',
    dragging && 'scale-[1.01] shadow-[3px_3px_0_0_var(--foreground)]',
    active
      ? 'border-foreground bg-neon/15 shadow-[2px_2px_0_0_var(--foreground)]'
      : 'hover:bg-muted/20',
  )
}

export function modelPixelByokCardClass(selected?: boolean) {
  return cn(
    'group flex items-center gap-2 border-2 border-foreground bg-background px-2.5 py-2 shadow-[2px_2px_0_0_var(--foreground)] transition-colors',
    selected ? 'bg-neon/20' : 'hover:bg-muted/30',
  )
}

export function modelPixelChipClass(active?: boolean) {
  return cn(
    'border-2 border-foreground px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
    active ? 'bg-neon text-ink shadow-[1px_1px_0_0_var(--foreground)]' : 'bg-background text-muted-foreground',
  )
}

export function modelPixelPresetChipClass(selected?: boolean) {
  return editorPixelTabClass(selected, 'inline-flex items-center gap-1.5 px-2 py-1 text-[11px]')
}

export function modelPixelPlanChipClass(selected?: boolean) {
  return editorPixelButtonClass(selected, 'px-2 py-1 text-[11px]')
}

export const MODEL_PIXEL_TRIGGER = cn(
  'relative inline-flex items-center gap-1.5 border-2 border-foreground bg-background font-mono font-bold text-foreground',
  'shadow-[2px_2px_0_0_var(--foreground)] outline-none transition-colors',
  'hover:bg-neon/20 focus-visible:ring-2 focus-visible:ring-primary/40',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

export const MODEL_PIXEL_DROPDOWN = cn(
  'rounded-none border-2 border-foreground bg-background p-1 shadow-[3px_3px_0_0_var(--foreground)]',
)

export function modelPixelPickerRowClass(selected?: boolean) {
  return cn(
    'flex w-full items-center gap-2.5 px-2 py-2 text-left transition-colors',
    'hover:bg-neon/25 focus-visible:bg-neon/25 focus-visible:outline-none',
    selected && 'border-l-[3px] border-l-foreground bg-neon/25',
  )
}

export function modelPixelActionBtnClass(className?: string) {
  return editorPixelButtonClass(false, cn('h-7 px-2 text-[10px] shadow-[1px_1px_0_0_var(--foreground)]', className))
}

export function modelPixelDestructiveBtnClass(className?: string) {
  return cn(
    modelPixelActionBtnClass(),
    'text-destructive hover:bg-destructive/10',
    className,
  )
}

export function modelPixelTestBadgeClass(ok?: boolean) {
  return cn(
    modelPixelChipClass(false),
    ok ? 'bg-neon text-ink' : 'bg-destructive/15 text-destructive',
  )
}

export const MODEL_PIXEL_GROUP_LABEL =
  'px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground'

export const MODEL_PIXEL_SEARCH_ROW =
  'mb-1 flex items-center gap-2 border-b-2 border-foreground/15 px-2 pb-2 pt-1'
