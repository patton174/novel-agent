import { cn } from '@/lib/utils'
import type { EditorButtonSize } from '@/components/ui/EditorButton'

export function editorIconButtonClass(className?: string) {
  return cn(
    'size-8 shrink-0 rounded-xl border border-border bg-background text-muted-foreground',
    'hover:border-primary/30 hover:bg-primary/10 hover:text-foreground',
    className,
  )
}

export function editorNavButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto w-full justify-start gap-2 rounded-xl px-3 py-2.5 text-ui font-normal',
    active
      ? 'bg-primary/10 font-semibold text-foreground'
      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
    className,
  )
}

export function editorTabButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto rounded-xl px-3.5 py-2 text-ui font-normal',
    active
      ? 'bg-primary/10 font-semibold text-foreground'
      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
    className,
  )
}

export function editorDashedButtonClass(size: EditorButtonSize = 'md', className?: string) {
  return cn(
    'h-auto w-full border-dashed text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
    size === 'sm' ? 'rounded-xl px-2 py-2 text-ui-sm' : 'rounded-xl px-3 py-2.5 text-ui',
    className,
  )
}

export function editorPanelButtonClass(className?: string) {
  return cn(
    'h-auto w-full justify-between rounded-none px-3 py-2.5 text-ui font-semibold text-muted-foreground shadow-none',
    'hover:bg-transparent hover:text-foreground',
    className,
  )
}

export function editorToggleButtonClass(className?: string) {
  return cn(
    'size-[30px] shrink-0 rounded-xl bg-muted/60 p-0 text-muted-foreground shadow-none',
    'hover:bg-primary/10 hover:text-foreground',
    className,
  )
}

export function editorChoiceButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left font-medium shadow-none',
    active
      ? 'border-primary/30 bg-primary/10 text-foreground'
      : 'border-primary/15 bg-muted/30 text-foreground hover:border-primary/40 hover:bg-primary/5',
    '[&_strong]:text-sm [&_strong]:font-semibold',
    '[&_span]:text-ui [&_span]:font-normal [&_span]:text-muted-foreground',
    className,
  )
}

export function editorChapterButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto flex-1 flex-col items-start rounded-xl bg-transparent px-3 py-2.5 text-left font-semibold shadow-none',
    'transition-transform hover:translate-x-0.5',
    '[&_.chapter-num]:text-[10px] [&_.chapter-num]:uppercase [&_.chapter-num]:tracking-wide',
    '[&_.chapter-title]:mt-0.5 [&_.chapter-title]:text-ui [&_.chapter-title]:font-semibold',
    '[&_.chapter-status]:mt-0.5 [&_.chapter-status]:text-[10px]',
    active
      ? 'bg-transparent hover:bg-transparent [&_.chapter-num]:text-primary/80 [&_.chapter-title]:text-foreground [&_.chapter-status]:text-primary/70'
      : '[&_.chapter-num]:text-muted-foreground/70 [&_.chapter-title]:text-muted-foreground [&_.chapter-status]:text-muted-foreground/60',
    className,
  )
}

export function editorVolumeButtonClass(className?: string) {
  return cn(
    'h-auto flex-1 justify-start gap-1.5 rounded-none bg-transparent px-0.5 py-1 text-left text-ui text-foreground shadow-none',
    '[&_.title]:flex-1 [&_.title]:text-ui [&_.title]:font-bold [&_.title]:text-foreground',
    '[&_.meta]:text-ui-sm [&_.meta]:font-normal [&_.meta]:text-muted-foreground',
    className,
  )
}

export function editorSegmentButtonClass(active?: boolean, className?: string) {
  return cn(
    'h-auto w-full justify-between rounded-xl px-2.5 py-2 text-[12px] shadow-none',
    active
      ? 'border border-primary/20 bg-primary/10 text-foreground'
      : 'border border-transparent bg-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground',
    className,
  )
}

export const EDITOR_SESSION_LOAD_MORE =
  'mt-1 w-full rounded-xl border border-dashed border-border bg-transparent px-2 py-1.5 text-ui-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'

export function editorSendButtonClass(streaming?: boolean, className?: string) {
  return cn(
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden border p-0 transition-colors duration-200',
    'disabled:cursor-not-allowed disabled:opacity-45',
    streaming
      ? 'rounded-md border-destructive/20 bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : 'rounded-md border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90',
    className,
  )
}
