import { useCallback, useLayoutEffect, useState, type MutableRefObject, type RefObject } from 'react'
import {
  computeThinkRailSegments,
  type ThinkRailSegment,
} from '../../../utils/thinkRailGeometry'

const RAIL_CLASS =
  'absolute w-[2px] -translate-x-1/2 rounded-sm bg-[color-mix(in_srgb,var(--primary)_50%,transparent)] dark:bg-[color-mix(in_srgb,var(--primary)_62%,transparent)]'

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
  }, [containerRef, leadRefs, thinkIds, remeasureKey])

  useLayoutEffect(() => {
    measure()
    let frame = 0
    let raf = 0
    const tick = () => {
      measure()
      frame += 1
      if (frame < 4) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)

    const container = containerRef.current
    if (!container) {
      return () => cancelAnimationFrame(raf)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    for (const id of thinkIds) {
      const el = leadRefs.current.get(id)
      if (el) {
        observer.observe(el)
      }
    }
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', measure)
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
