import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { findOutlineDropTarget } from '@/components/novel/outline/outlineTouchDom'
import type { DragPayload, DropTarget } from '@/components/novel/outline/outlineTypes'

interface TouchDragState {
  payload: DragPayload
  label: string
  x: number
  y: number
}

export interface UseOutlineTouchDragOptions {
  enabled: boolean
  busy: boolean
  setDropTarget: (
    target: DropTarget | null | ((current: DropTarget | null) => DropTarget | null),
  ) => void
  onDropChapter: (
    draggedChapterId: string,
    targetVolumeId: string,
    beforeChapterId: string | null,
  ) => Promise<void>
  onDropVolume: (draggedVolumeId: string, targetVolumeId: string) => Promise<void>
}

export function useOutlineTouchDrag({
  enabled,
  busy,
  setDropTarget,
  onDropChapter,
  onDropVolume,
}: UseOutlineTouchDragOptions) {
  const [touchDrag, setTouchDrag] = useState<TouchDragState | null>(null)
  const touchDragRef = useRef<TouchDragState | null>(null)
  touchDragRef.current = touchDrag

  const clearTouchDrag = useCallback(() => {
    setTouchDrag(null)
    setDropTarget(null)
  }, [setDropTarget])

  const bindTouchHandle = useCallback(
    (payload: DragPayload, label: string) => ({
      onTouchStart: (event: ReactTouchEvent) => {
        if (!enabled || busy) return
        const touch = event.changedTouches[0]
        if (!touch) return
        event.stopPropagation()
        setTouchDrag({
          payload,
          label,
          x: touch.clientX,
          y: touch.clientY,
        })
      },
    }),
    [busy, enabled],
  )

  useEffect(() => {
    if (!touchDrag) return

    const onTouchMove = (event: globalThis.TouchEvent) => {
      event.preventDefault()
      const touch = event.changedTouches[0]
      if (!touch) return
      setTouchDrag((prev) =>
        prev
          ? {
              ...prev,
              x: touch.clientX,
              y: touch.clientY,
            }
          : null,
      )
      setDropTarget(findOutlineDropTarget(touch.clientX, touch.clientY))
    }

    const onTouchEnd = async (event: globalThis.TouchEvent) => {
      const touch = event.changedTouches[0]
      const state = touchDragRef.current
      if (!touch || !state) {
        clearTouchDrag()
        return
      }
      const target = findOutlineDropTarget(touch.clientX, touch.clientY)
      const payload = state.payload
      clearTouchDrag()

      if (!target || busy) return

      try {
        if (payload.kind === 'chapter' && target.kind === 'chapter') {
          await onDropChapter(payload.id, target.volumeId, target.chapterId ?? null)
        } else if (payload.kind === 'volume' && target.kind === 'volume') {
          if (payload.id !== target.volumeId) {
            await onDropVolume(payload.id, target.volumeId)
          }
        }
      } catch {
        /* caller handles toast */
      }
    }

    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [busy, clearTouchDrag, onDropChapter, onDropVolume, setDropTarget, touchDrag])

  const touchDragging = touchDrag?.payload ?? null

  const ghost =
    touchDrag &&
    createPortal(
      <div
        className="pointer-events-none fixed z-[2000] max-w-[220px] truncate rounded-lg border border-primary/40 bg-primary/95 px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg"
        style={{
          left: touchDrag.x,
          top: touchDrag.y,
          transform: 'translate(-50%, -120%)',
        }}
      >
        {touchDrag.label}
      </div>,
      document.body,
    )

  return {
    touchDragging,
    bindTouchHandle,
    touchDragGhost: ghost,
  }
}
