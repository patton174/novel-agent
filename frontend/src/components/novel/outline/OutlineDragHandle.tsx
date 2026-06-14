import type { DragEvent, TouchEvent } from 'react'
import { OUTLINE_DRAG_HANDLE } from '@/lib/outlineClasses'
import { cn } from '@/lib/utils'

interface OutlineDragHandleProps {
  title: string
  disabled?: boolean
  className?: string
  onDragStart?: (event: DragEvent) => void
  onDragEnd?: () => void
  onTouchStart?: (event: TouchEvent) => void
}

export function OutlineDragHandle({
  title,
  disabled,
  className,
  onDragStart,
  onDragEnd,
  onTouchStart,
}: OutlineDragHandleProps) {
  return (
    <span
      className={cn(OUTLINE_DRAG_HANDLE, disabled && 'opacity-40', className)}
      draggable={!disabled}
      title={title}
      style={{ touchAction: 'none' }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
    >
      ⋮⋮
    </span>
  )
}
