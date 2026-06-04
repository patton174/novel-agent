import type { DragEvent } from 'react'
import type { DragPayload } from './outlineTypes'
import { OUTLINE_DRAG_MIME } from './outlineTypes'

export function readDragPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(OUTLINE_DRAG_MIME)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DragPayload
  } catch {
    return null
  }
}

export function writeDragPayload(event: DragEvent, payload: DragPayload) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(OUTLINE_DRAG_MIME, JSON.stringify(payload))
}

export function allowOutlineDrop(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}
