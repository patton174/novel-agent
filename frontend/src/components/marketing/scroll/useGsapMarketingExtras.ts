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
          start: 'top 85%',
          once: true,
        },
        opacity: 0,
        y: 20,
        stagger: 0.06,
        duration: 0.55,
        ease: 'power2.out',
      })
    })
  })
}
