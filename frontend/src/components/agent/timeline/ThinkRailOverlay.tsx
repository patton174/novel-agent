import { useCallback, useLayoutEffect, useState, type MutableRefObject, type RefObject } from 'react'
import {
  computeThinkRailSegments,
  type ThinkRailSegment,
} from '../../../utils/thinkRailGeometry'

const RAIL_CLASS =
  'absolute w-[2px] -translate-x-1/2 rounded-sm bg-[color-mix(in_srgb,var(--primary)_50%,transparent)] dark:bg-[color-mix(in_srgb,var(--primary)_62%,transparent)]'

const REMEASURE_DELAYS_MS = [50, 120, 240, 380, 520] as const

export function ThinkRailOverlay({
  thinkIds,
  leadRefs,
  containerRef,
  remeasureKey = 0,
}: {
  thinkIds: readonly string[]
  leadRefs: MutableRefObject<Map<string, HTMLElement>>
  containerRef: RefObject<HTMLElement | null>
  remeasureKey?: string | number
}) {
  const [segments, setSegments] = useState<ThinkRailSegment[]>([])

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container || thinkIds.length < 2) {
      setSegments([])
      return
    }
    const containerRect = container.getBoundingClientRect()
    const leadRects = new Map<
      string,
      { left: number; right: number; bottom: number; top: number }
    >()
    for (const id of thinkIds) {
      const el = leadRefs.current.get(id)
      if (el) {
        leadRects.set(id, el.getBoundingClientRect())
      }
    }
    setSegments(computeThinkRailSegments(containerRect, thinkIds, leadRects))
  }, [containerRef, leadRefs, thinkIds])

  useLayoutEffect(() => {
    let cancelled = false
    const safeMeasure = () => {
      if (!cancelled) {
        measure()
      }
    }

    safeMeasure()

    let frame = 0
    let raf = 0
    const maxFrames = 16
    const tick = () => {
      safeMeasure()
      frame += 1
      if (frame < maxFrames) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)

    const delayHandles = REMEASURE_DELAYS_MS.map((ms) =>
      window.setTimeout(safeMeasure, ms),
    )

    const container = containerRef.current
    if (!container) {
      return () => {
        cancelled = true
        cancelAnimationFrame(raf)
        delayHandles.forEach((handle) => window.clearTimeout(handle))
      }
    }

    const observer = new ResizeObserver(safeMeasure)
    observer.observe(container)
    for (const id of thinkIds) {
      const el = leadRefs.current.get(id)
      if (el) {
        observer.observe(el)
      }
    }
    window.addEventListener('resize', safeMeasure)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      delayHandles.forEach((handle) => window.clearTimeout(handle))
      observer.disconnect()
      window.removeEventListener('resize', safeMeasure)
    }
  }, [measure, thinkIds, leadRefs, containerRef, remeasureKey])

  if (segments.length === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      data-testid="think-rail-overlay"
      aria-hidden
    >
      {segments.map((segment, index) => (
        <div
          key={`${segment.left}-${segment.top}-${index}`}
          data-testid="think-rail-segment"
          className={RAIL_CLASS}
          style={{
            left: segment.left,
            top: segment.top,
            height: segment.height,
          }}
        />
      ))}
    </div>
  )
}
