import { useEffect, type RefObject } from 'react'
import { useReducedMotion } from 'framer-motion'

/** 编排演示时间线内容增高时自动滚到底，避免步骤被裁切 */
export function useOrchestrationTimelineAutoscroll(
  timelineRef: RefObject<HTMLElement | null>,
  tick: number,
  enabled = true,
) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!enabled) return
    const el = timelineRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [tick, enabled, reduced, timelineRef])
}
