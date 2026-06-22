import { useEffect, useState, type RefObject } from 'react'
import { clamp01, easeInOutCubic } from '@/lib/marketingStoryScroll'

/** 演示卡片底部进入视口、可见高度达 10% 时开始计 progress */
export const DEMO_VISIBLE_START_RATIO = 0.1

/**
 * 分镜滚动进度 0–1：
 * - 0：演示卡片刚露出底部 10%
 * - 1：当前 section 底部到达视口底（下一幕即将进入）前播完
 */
export function useMarketingSceneScrollProgress(
  sectionRef: RefObject<HTMLElement | null>,
  demoRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setProgress(0)
      return
    }

    const measure = () => {
      const section = sectionRef.current
      const demo = demoRef.current
      if (!section || !demo) return

      const vh = window.innerHeight
      const demoRect = demo.getBoundingClientRect()
      const sectionRect = section.getBoundingClientRect()
      const demoH = Math.max(demoRect.height, 1)

      const demoStartTop = vh - DEMO_VISIBLE_START_RATIO * demoH

      if (demoRect.top > demoStartTop) {
        setProgress(0)
        return
      }

      if (sectionRect.bottom <= vh) {
        setProgress(1)
        return
      }

      const scrolled = demoStartTop - demoRect.top
      const total = Math.max(sectionRect.height - demoH * (1 - DEMO_VISIBLE_START_RATIO), demoH * 0.5)
      const linear = clamp01(scrolled / total)
      setProgress(easeInOutCubic(linear))
    }

    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [enabled, sectionRef, demoRef])

  return progress
}
