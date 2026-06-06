import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, type DependencyList, type RefObject } from 'react'
import { scheduleScrollTriggerRefresh, useMarketingScroll } from '../MarketingScrollProvider'

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Run GSAP/ScrollTrigger setup only after scroll system is ready.
 */
export function useMarketingGsapEffect(
  effect: () => void | (() => void),
  deps: DependencyList = [],
  scopeRef?: RefObject<HTMLElement | null>,
) {
  const { scrollReady } = useMarketingScroll()

  useLayoutEffect(() => {
    if (!scrollReady) return

    const scope = scopeRef?.current
    if (scopeRef && !scope) return

    let cleanup: void | (() => void)

    if (scope) {
      const ctx = gsap.context(() => {
        cleanup = effect()
      }, scope)
      scheduleScrollTriggerRefresh()
      return () => {
        if (typeof cleanup === 'function') cleanup()
        ctx.revert()
      }
    }

    cleanup = effect()
    scheduleScrollTriggerRefresh()
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollReady, scopeRef?.current, ...deps])
}
