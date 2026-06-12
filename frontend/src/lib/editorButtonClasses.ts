import { cn } from '@/lib/utils'
import type { EditorButtonSize } from '@/components/ui/EditorButton'

export function editorIconButtonClass(className?: string) {
  return cn(
    'size-8 shrink-0 rounded-lg border border-border bg-background text-muted-foreground',
    'hover:border-primary/30 hover:bg-primary/10 hover:text-foreground',
    className,
  )
}

export function editorNavButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto w-full justify-start gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-normal',
    active
      ? 'bg-primary/10 font-semibold text-foreground'
      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
    className,
  )
}

export function editorTabButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto rounded-lg px-3.5 py-2 text-[13px] font-normal',
    active
      ? 'bg-primary/10 font-semibold text-foreground'
      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
    className,
  )
}

export function editorDashedButtonClass(size: EditorButtonSize = 'md', className?: string) {
  return cn(
    'h-auto w-full border-dashed text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
    size === 'sm' ? 'rounded-lg px-2 py-2 text-[11px]' : 'rounded-[10px] px-3 py-2.5 text-[13px]',
    className,
  )
}

export function editorPanelButtonClass(className?: string) {
  return cn(
    'h-auto w-full justify-between rounded-none px-3 py-2.5 text-[13px] font-semibold text-muted-foreground shadow-none',
    'hover:bg-transparent hover:text-foreground',
    className,
  )
}

export function editorToggleButtonClass(className?: string) {
  return cn(
    'size-[30px] shrink-0 rounded-lg bg-muted/60 p-0 text-muted-foreground shadow-none',
    'hover:bg-primary/10 hover:text-foreground',
    className,
  )
}

export function editorChoiceButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto w-full flex-col items-start gap-0.5 rounded-[10px] border px-3 py-2.5 text-left font-medium shadow-none',
    active
      ? 'border-primary/30 bg-primary/10 text-foreground'
      : 'border-primary/15 bg-muted/30 text-foreground hover:border-primary/40 hover:bg-primary/5',
    '[&_strong]:text-sm [&_strong]:font-semibold',
    '[&_span]:text-[13px] [&_span]:font-normal [&_span]:text-muted-foreground',
    className,
  )
}

export function editorChapterButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto flex-1 flex-col items-start rounded-[10px] bg-transparent px-3 py-2.5 text-left font-semibold shadow-none',
    'transition-transform hover:translate-x-0.5',
    '[&_.chapter-num]:text-[10px] [&_.chapter-num]:uppercase [&_.chapter-num]:tracking-wide',
    '[&_.chapter-title]:mt-0.5 [&_.chapter-title]:text-[13px] [&_.chapter-title]:font-semibold',
    '[&_.chapter-status]:mt-0.5 [&_.chapter-status]:text-[10px]',
    active
      ? '[&_.chapter-num]:text-foreground [&_.chapter-title]:text-foreground [&_.chapter-status]:text-foreground'
      : '[&_.chapter-num]:text-muted-foreground/70 [&_.chapter-title]:text-muted-foreground [&_.chapter-status]:text-muted-foreground/60',
    className,
  )
}

export function editorVolumeButtonClass(className?: string) {
  return cn(
    'h-auto flex-1 justify-start gap-1.5 rounded-none bg-transparent px-0.5 py-1 text-left text-[13px] text-foreground shadow-none',
    '[&_.title]:flex-1 [&_.title]:text-[13px] [&_.title]:font-bold [&_.title]:text-foreground',
    '[&_.meta]:text-[11px] [&_.meta]:font-normal [&_.meta]:text-muted-foreground',
    className,
  )
}

export function editorSegmentButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto w-full justify-between rounded-[10px] px-2.5 py-2 text-[12px] shadow-none',
    active
      ? 'border border-primary/20 bg-primary/10 text-foreground'
      : 'border border-transparent bg-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground',
    className,
  )
}

export const EDITOR_SESSION_LOAD_MORE =
  'mt-1 w-full rounded-lg border border-dashed border-border bg-transparent px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'

export function editorSendButtonClass(streaming?: boolean, className?: string) {
  return cn(
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden p-0 text-primary-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.15,0.64,1)]',
    'hover:scale-105 active:scale-[0.96] disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-45',
    streaming
      ? 'rounded-[10px] bg-destructive shadow-md shadow-destructive/30'
      : 'rounded-full bg-primary shadow-md',
    className,
  )
}
