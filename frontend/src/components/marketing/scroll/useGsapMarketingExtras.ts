import { gsap } from 'gsap'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'

export function useGsapMarketingExtras() {
  useMarketingGsapEffect(() => {
    if (prefersReducedMotion()) return

    gsap.utils.toArray<HTMLElement>('.marketing-reveal-batch').forEach((batch) => {
      const items = batch.querySelectorAll(':scope > *')
      if (items.length === 0) return
      gsap.from(items, {
        scrollTrigger: {
          trigger: batch,
          start: 'top 78%',
          once: true,
        },
        opacity: 0,
        y: 48,
        scale: 0.96,
        stagger: 0.1,
        duration: 0.85,
        ease: 'power3.out',
      })
    })

    gsap.utils.toArray<HTMLElement>('[data-marketing-parallax]').forEach((el) => {
      gsap.to(el, {
        y: -32,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      })
    })
  })
}
