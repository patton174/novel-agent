import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RefObject } from 'react'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'
import { scheduleScrollTriggerRefresh } from '../MarketingScrollProvider'

gsap.registerPlugin(ScrollTrigger)

/** 能力时间轴：滚动 scrub 延伸主线 + 分支卡片展开 */
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
      branches.forEach((b) => gsap.set(b, { scaleX: 1 }))
      cards.forEach((c) => gsap.set(c, { opacity: 1, x: 0, filter: 'blur(0px)' }))
      dots.forEach((d) => gsap.set(d, { scale: 1, opacity: 1 }))
      return
    }

    const triggers: ScrollTrigger[] = []

    if (line && track) {
      gsap.set(line, { scaleY: 0, transformOrigin: 'top center' })
      const st = gsap.to(line, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: 'top 80%',
          end: 'bottom 18%',
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      }).scrollTrigger
      if (st) triggers.push(st)
    }

    nodes.forEach((node, index) => {
      const branch = branches[index]
      const card = cards[index]
      const dot = dots[index]
      const side = (card?.dataset.side ?? node.dataset.side) === 'right' ? 1 : -1

      if (dot) {
        gsap.set(dot, { scale: 0.35, opacity: 0.35 })
      }
      if (branch) {
        const branchSide = branch.dataset.side === 'right' ? 'right' : 'left'
        gsap.set(branch, {
          scaleX: 0,
          transformOrigin: branchSide === 'left' ? 'right center' : 'left center',
        })
      }
      if (card) {
        gsap.set(card, { opacity: 0, x: side * 40, filter: 'blur(6px)' })
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: node,
          start: 'top 86%',
          end: 'top 42%',
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
      })

      if (dot) {
        tl.to(dot, { scale: 1, opacity: 1, ease: 'back.out(2)', duration: 0.3 }, 0)
      }
      if (branch) {
        tl.to(branch, { scaleX: 1, ease: 'power2.out', duration: 0.4 }, 0.06)
      }
      if (card) {
        tl.to(
          card,
          { opacity: 1, x: 0, filter: 'blur(0px)', ease: 'power3.out', duration: 0.5 },
          0.14,
        )
      }

      const st = tl.scrollTrigger
      if (st) triggers.push(st)
    })

    scheduleScrollTriggerRefresh()
    const onLoad = () => scheduleScrollTriggerRefresh()
    window.addEventListener('load', onLoad, { once: true })

    return () => {
      window.removeEventListener('load', onLoad)
      triggers.forEach((st) => st.kill())
    }
  }, [], rootRef)
}
