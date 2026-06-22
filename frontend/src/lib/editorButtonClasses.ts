import { cn } from '@/lib/utils'
import type { EditorButtonSize } from '@/components/ui/EditorButton'
import {
  editorPixelButtonClass,
  editorPixelChoiceButtonClass,
  editorPixelIconButtonClass,
  editorPixelNavItemClass,
  editorPixelSendButtonClass,
  editorPixelTabClass,
} from '@/lib/editorPixelClasses'

export function editorIconButtonClass(className?: string) {
  return editorPixelIconButtonClass(className)
}

export function editorNavButtonClass(active?: boolean, className?: string) {
  return editorPixelNavItemClass(active, className)
}

export function editorTabButtonClass(active?: boolean, className?: string) {
  return editorPixelTabClass(active, className)
}

export function editorDashedButtonClass(size: EditorButtonSize = 'md', className?: string) {
  return cn(
    'h-auto w-full border-2 border-dashed border-foreground font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground',
    'hover:border-foreground hover:bg-neon/20 hover:text-foreground',
    size === 'sm' ? 'px-2 py-2 text-[0.68rem]' : 'px-3 py-2.5',
    className,
  )
}

export function editorPanelButtonClass(className?: string) {
  return cn(
    'h-auto w-full justify-between border-none bg-transparent px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-none',
    'hover:bg-muted/40 hover:text-foreground',
    className,
  )
}

export function editorToggleButtonClass(className?: string) {
  return editorPixelIconButtonClass(cn('size-[30px]', className))
}

export function editorChoiceButtonClass(active?: boolean, className?: string) {
  return editorPixelChoiceButtonClass(active, className)
}

export function editorChapterButtonClass(active?: boolean, className?: string) {
  void active
  return cn(
    'flex h-auto min-h-[2rem] flex-1 flex-row items-center gap-2 border-2 border-transparent bg-transparent px-2 py-1 text-left font-mono shadow-none',
    'text-muted-foreground outline-none',
    'hover:border-transparent hover:bg-transparent',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent',
    'active:translate-y-0',
    '[&_.chapter-num]:shrink-0 [&_.chapter-num]:text-[10px] [&_.chapter-num]:uppercase [&_.chapter-num]:tracking-wide',
    '[&_.chapter-title]:min-w-0 [&_.chapter-title]:flex-1 [&_.chapter-title]:truncate [&_.chapter-title]:text-xs [&_.chapter-title]:font-bold',
    '[&_.chapter-status]:ml-auto [&_.chapter-status]:shrink-0 [&_.chapter-status]:text-[10px]',
    className,
  )
}

export function editorVolumeButtonClass(className?: string) {
  return cn(
    'h-auto flex-1 justify-start gap-1.5 border-none bg-transparent px-0.5 py-1 text-left font-mono shadow-none',
    '[&_.title]:flex-1 [&_.title]:text-xs [&_.title]:font-bold [&_.title]:uppercase',
    '[&_.meta]:text-[0.68rem] [&_.meta]:font-normal [&_.meta]:text-muted-foreground',
    className,
  )
}

export function editorSegmentButtonClass(active?: boolean, className?: string) {
  return editorPixelButtonClass(active, cn('h-auto w-full justify-between px-2.5 py-2 text-[12px]', className))
}

export const EDITOR_SESSION_LOAD_MORE = cn(
  'mt-1 w-full border-2 border-dashed border-foreground bg-transparent px-2 py-1.5 font-mono text-[0.68rem] font-bold uppercase text-muted-foreground',
  'transition-colors hover:bg-neon/20 hover:text-foreground',
)

export function editorSendButtonClass(streaming?: boolean, className?: string) {
  return editorPixelSendButtonClass(streaming, className)
}
