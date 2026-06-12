import { gsap } from 'gsap'
import type { RefObject } from 'react'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'

/** 能力时间轴：中心竖线 + 左右分支卡片随滚动生长 */
export function useHomeTimelineScroll(rootRef: RefObject<HTMLElement | null>) {
  useMarketingGsapEffect(() => {
    const root = rootRef.current
    if (!root) return

    const line = root.querySelector<HTMLElement>('[data-timeline-line]')
    const nodes = root.querySelectorAll<HTMLElement>('[data-timeline-node]')
    const branches = root.querySelectorAll<HTMLElement>('[data-timeline-branch]')
    const cards = root.querySelectorAll<HTMLElement>('[data-timeline-card]')

    if (prefersReducedMotion()) {
      if (line) gsap.set(line, { scaleY: 1 })
      nodes.forEach((n) => gsap.set(n, { opacity: 1, scale: 1 }))
      branches.forEach((b) => gsap.set(b, { scaleX: 1 }))
      cards.forEach((c) => gsap.set(c, { opacity: 1, x: 0 }))
      return
    }

    const ctx = gsap.context(() => {
      if (line) {
        gsap.set(line, { scaleY: 0, transformOrigin: 'top center' })
        gsap.to(line, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top 70%',
            end: 'bottom 30%',
            scrub: 0.45,
          },
        })
      }

      nodes.forEach((node, index) => {
        const branch = branches[index]
        const card = cards[index]
        const side = node.dataset.side === 'right' ? 1 : -1

        gsap.set(node, { opacity: 0, scale: 0.6 })
        gsap.set(branch, { scaleX: 0, transformOrigin: side === 1 ? 'left center' : 'right center' })
        gsap.set(card, { opacity: 0, x: side * 28 })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: node,
            start: 'top 78%',
            once: true,
          },
        })

        tl.to(node, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.6)' })
          .to(branch, { scaleX: 1, duration: 0.45, ease: 'power2.out' }, '-=0.15')
          .to(card, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, '-=0.25')
      })
    }, root)

    return () => ctx.revert()
  }, [], rootRef)
}
