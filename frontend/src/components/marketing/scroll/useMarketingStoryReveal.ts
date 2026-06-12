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
        .querySelectorAll<HTMLElement>('.story-copy, .demo-app-mock, .demo-agent-console')
        .forEach((el) => gsap.set(el, { opacity: 1, y: 0, clearProps: 'all' }))
      return
    }

    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-marketing-scene]').forEach((section) => {
        const copy = section.querySelector<HTMLElement>('.story-copy')
        const demo =
          section.querySelector<HTMLElement>('.demo-app-mock') ??
          section.querySelector<HTMLElement>('.demo-agent-console')

        if (copy) {
          const parts = gsap.utils.toArray<HTMLElement>(copy.children)
          gsap.from(parts.length > 0 ? parts : [copy], {
            opacity: 0,
            y: 20,
            duration: 0.48,
            stagger: 0.07,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              once: true,
            },
          })
        }
        if (demo) {
          gsap.from(demo, {
            opacity: 0,
            y: 16,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 82%',
              once: true,
            },
          })
        }
      })
    }, root)

    return () => ctx.revert()
  }, [], rootRef)
}
