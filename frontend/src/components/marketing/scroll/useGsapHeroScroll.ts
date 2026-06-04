import { gsap } from 'gsap'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'

/** Hero 区随滚动淡出 + 背景光斑视差（对标 Cursor 首屏） */
export function useGsapHeroScroll() {
  useMarketingGsapEffect(() => {
    if (prefersReducedMotion()) return

    const hero = document.getElementById('hero')
    if (!hero) return

    const card = hero.querySelector<HTMLElement>('[data-hero-card]')
    const shapes = gsap.utils.toArray<HTMLElement>('.marketing-shape')
    const pattern = document.querySelector<HTMLElement>('[data-hero-pattern]')

    if (card) {
      gsap.fromTo(
        card,
        { y: 0, scale: 1, filter: 'blur(0px)' },
        {
          y: -48,
          scale: 0.94,
          filter: 'blur(2px)',
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.65,
          },
        },
      )
    }

    if (shapes.length) {
      gsap.to(shapes, {
        y: (i) => (i + 1) * 72,
        x: (i) => (i % 2 === 0 ? -24 : 24),
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.85,
        },
      })
    }

    if (pattern) {
      gsap.to(pattern, {
        opacity: 0.55,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
    }
  })
}
