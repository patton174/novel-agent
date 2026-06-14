import { forwardRef, useEffect, type HTMLAttributes } from 'react'
import {
  EDITOR_MODAL_BODY,
  EDITOR_MODAL_HEADER,
  EDITOR_MODAL_INSET,
  EDITOR_MODAL_OVERLAY,
  EDITOR_MODAL_PANEL,
  EDITOR_MODAL_SIZE,
  type EditorModalSize,
} from '@/lib/editorModalClasses'
import { cn } from '@/lib/utils'

export type { EditorModalSize }

export function useEditorModalEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

export function EditorModalOverlay({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(EDITOR_MODAL_OVERLAY, className)} {...props} />
}

export function EditorModalPanel({
  size = 'settings',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: EditorModalSize }) {
  return (
    <div className={cn(EDITOR_MODAL_PANEL, EDITOR_MODAL_SIZE[size], className)} {...props} />
  )
}

export function EditorModalHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(EDITOR_MODAL_HEADER, className)} {...props} />
}

export const EditorModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function EditorModalBody({ className, ...props }, ref) {
    return <div ref={ref} className={cn(EDITOR_MODAL_BODY, className)} {...props} />
  },
)

export function EditorModalPanelInset({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(EDITOR_MODAL_INSET, className)} {...props} />
}
