import type { TargetAndTransition, Transition, ViewportOptions } from 'framer-motion'

interface MarketingInViewMotionOptions {
  isMobile: boolean
  reduced: boolean
  desktopInitial?: false | TargetAndTransition
  desktopWhileInView?: TargetAndTransition
  mobileInitial?: false | TargetAndTransition
  mobileWhileInView?: TargetAndTransition
  viewport?: ViewportOptions
  transition?: Transition
}

/**
 * 统一营销区 in-view 策略：
 * - desktop: 保留位移动画
 * - mobile: 降级为 opacity-only（默认）
 * - reduced-motion: 直接静态最终态
 */
export function marketingInViewMotion({
  isMobile,
  reduced,
  desktopInitial = { opacity: 0, y: 20 },
  desktopWhileInView = { opacity: 1, y: 0 },
  mobileInitial = { opacity: 0 },
  mobileWhileInView = { opacity: 1 },
  viewport = { once: true, margin: '-8% 0px', amount: 0.25 },
  transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}: MarketingInViewMotionOptions) {
  if (reduced) {
    return {
      initial: false as const,
    }
  }

  if (isMobile) {
    return {
      initial: mobileInitial,
      whileInView: mobileWhileInView,
      viewport,
      transition,
    }
  }

  return {
    initial: desktopInitial,
    whileInView: desktopWhileInView,
    viewport,
    transition,
  }
}
