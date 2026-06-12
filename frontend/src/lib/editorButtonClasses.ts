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
