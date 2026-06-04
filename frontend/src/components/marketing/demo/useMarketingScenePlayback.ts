import { useEffect, useState, type RefObject } from 'react'
import {
  scenePlayableEventCount,
  type MarketingSceneId,
} from '../../../utils/marketing/buildMarketingSceneDemo'
import { prefersReducedMotion } from '../scroll/useMarketingGsapEffect'

/** 每个 SSE 事件步停留 */
const STEP_HOLD_MS = 1400
/** 全部事件播完后留给流式打字的时长 */
const STREAM_TAIL_MS = 5200
/** 循环重置前空白 */
const LOOP_GAP_MS = 600

export interface MarketingScenePlaybackOptions {
  /** Hero 首屏：不依赖 IntersectionObserver，挂载即播 */
  autoPlay?: boolean
}

/**
 * 按时间步进 agent 事件并循环；不在循环中 apply stream-end，避免直接「编排完成」静态页。
 */
export function useMarketingScenePlayback(
  scene: MarketingSceneId,
  sectionRef: RefObject<HTMLElement | null>,
  options: MarketingScenePlaybackOptions = {},
) {
  const { autoPlay = false } = options
  const total = scenePlayableEventCount(scene)
  const [eventStep, setEventStep] = useState(0)
  const [visible, setVisible] = useState(autoPlay)

  useEffect(() => {
    if (autoPlay) {
      setVisible(true)
      return
    }

    const el = sectionRef.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.12))
      },
      { threshold: [0, 0.12, 0.3] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sectionRef, autoPlay])

  useEffect(() => {
    if (!visible) {
      setEventStep(0)
      return
    }

    if (prefersReducedMotion()) {
      setEventStep(total)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const schedule = (step: number) => {
      if (cancelled) return
      setEventStep(step)

      if (step >= total) {
        timer = setTimeout(() => {
          if (cancelled) return
          setEventStep(0)
          timer = setTimeout(() => schedule(1), LOOP_GAP_MS)
        }, STREAM_TAIL_MS)
        return
      }

      if (step === 0) {
        timer = setTimeout(() => schedule(1), LOOP_GAP_MS)
        return
      }

      timer = setTimeout(() => schedule(step + 1), STEP_HOLD_MS)
    }

    schedule(0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [visible, total, scene])

  return { eventStep, total, visible }
}
