import { gsap } from 'gsap'
import type { RefObject } from 'react'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'

/** 分镜文案 / 演示框入场（与演示进度解耦） */
export function useMarketingStoryReveal(rootRef: RefObject<HTMLElement | null>) {
  useMarketingGsapEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (prefersReducedMotion()) {
      root
        .querySelectorAll<HTMLElement>('.story-copy, .demo-app-mock')
        .forEach((el) => gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: 'all' }))
      return
    }

    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-marketing-scene]').forEach((section) => {
        const copy = section.querySelector<HTMLElement>('.story-copy')
        const demo = section.querySelector<HTMLElement>('.demo-app-mock')

        if (copy) {
          gsap.fromTo(
            copy,
            { opacity: 0, y: 36 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 82%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        }
        if (demo) {
          gsap.fromTo(
            demo,
            { opacity: 0, y: 28, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 78%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        }
      })
    }, root)

    return () => ctx.revert()
  }, [], rootRef)
}
