import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RefObject } from 'react'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'

gsap.registerPlugin(ScrollTrigger)

/** 能力时间轴：进入视口后随滚动 scrub 延伸主线 + 分支卡片，上滚同步收起 */
export function useHomeTimelineScroll(rootRef: RefObject<HTMLElement | null>) {
  useMarketingGsapEffect(() => {
    const root = rootRef.current
    if (!root) return

    const track = root.querySelector<HTMLElement>('[data-timeline-track]')
    const line = root.querySelector<HTMLElement>('[data-timeline-line]')
    const nodes = gsap.utils.toArray<HTMLElement>('[data-timeline-node]', root)
    const branches = gsap.utils.toArray<HTMLElement>('[data-timeline-branch]', root)
    const cards = gsap.utils.toArray<HTMLElement>('[data-timeline-card]', root)
    const dots = gsap.utils.toArray<HTMLElement>('[data-timeline-dot]', root)

    if (prefersReducedMotion()) {
      if (line) gsap.set(line, { scaleY: 1 })
      nodes.forEach((n) => gsap.set(n, { opacity: 1 }))
      branches.forEach((b) => gsap.set(b, { scaleX: 1 }))
      cards.forEach((c) => gsap.set(c, { opacity: 1, x: 0 }))
      dots.forEach((d) => gsap.set(d, { scale: 1, opacity: 1 }))
      return
    }

    if (line && track) {
      gsap.set(line, { scaleY: 0, transformOrigin: 'top center' })
      gsap.to(line, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: 'top 85%',
          end: 'bottom 15%',
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      })
    }

    nodes.forEach((node, index) => {
      const branch = branches[index]
      const card = cards[index]
      const dot = dots[index]
      const side = node.dataset.side === 'right' ? 1 : -1

      if (dot) {
        gsap.set(dot, { scale: 0.55, opacity: 0.45 })
      }
      if (branch) {
        gsap.set(branch, {
          scaleX: 0,
          transformOrigin: side === 1 ? 'left center' : 'right center',
        })
      }
      if (card) {
        gsap.set(card, { opacity: 0.2, x: side * 24 })
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: node,
          start: 'top 88%',
          end: 'top 48%',
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      })

      if (dot) {
        tl.to(dot, { scale: 1, opacity: 1, ease: 'power2.out', duration: 0.25 }, 0)
      }
      if (branch) {
        tl.to(branch, { scaleX: 1, ease: 'power2.out', duration: 0.35 }, 0.05)
      }
      if (card) {
        tl.to(card, { opacity: 1, x: 0, ease: 'power3.out', duration: 0.45 }, 0.12)
      }
    })
  }, [], rootRef)
}
