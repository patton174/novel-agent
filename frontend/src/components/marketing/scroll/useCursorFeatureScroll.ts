import { gsap } from 'gsap'
import type { RefObject } from 'react'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'

const SCRUB = 0.4
const START = 'top 72px'

function pinSection(section: HTMLElement, pin: HTMLElement, end = '+=260%') {
  return gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: START,
      end,
      scrub: SCRUB,
      pin,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  })
}

function revealCopy(tl: gsap.core.Timeline, copy: HTMLElement | null) {
  if (!copy) return
  gsap.set(copy, { opacity: 0, y: 40 })
  tl.to(copy, { opacity: 1, y: 0, duration: 0.2, ease: 'power3.out' }, 0)
}

function revealCard(tl: gsap.core.Timeline, card: HTMLElement | null) {
  if (!card) return
  gsap.set(card, { opacity: 0, y: 32, scale: 0.96 })
  tl.to(card, { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'power3.out' }, 0.06)
}

function staggerSteps(section: HTMLElement, tl: gsap.core.Timeline, at: number) {
  const steps = section.querySelectorAll<HTMLElement>(
    '.cursor-user-prompt, .cursor-thinking, .cursor-step, .cursor-narrative, .cursor-chip, .cursor-status, .cursor-summary, .cursor-preview-hl, .cursor-stream-line, .cursor-task',
  )
  gsap.set(steps, { opacity: 0, y: 12 })
  tl.to(
    steps,
    {
      opacity: 1,
      y: 0,
      stagger: 0.06,
      duration: 0.14,
      ease: 'power2.out',
    },
    at,
  )
}

function showAll(root: HTMLElement) {
  root
    .querySelectorAll(
      '.story-copy, .cursor-feature-card, .cursor-user-prompt, .cursor-thinking, .cursor-step, .cursor-narrative, .cursor-chip, .cursor-status, .cursor-summary, .cursor-preview-hl, .cursor-stream-line, .cursor-task',
    )
    .forEach((el) => gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: 'all' }))
}

function setupSection(section: HTMLElement) {
  const pin = section.querySelector<HTMLElement>('.cursor-feature-pin')
  const copy = section.querySelector<HTMLElement>('.cursor-feature-copy')
  const card = section.querySelector<HTMLElement>('.cursor-feature-card')
  if (!pin) return

  const tl = pinSection(section, pin)
  revealCopy(tl, copy)
  revealCard(tl, card)
  staggerSteps(section, tl, 0.18)
}

export function useCursorFeatureScroll(rootRef: RefObject<HTMLElement | null>) {
  useMarketingGsapEffect(
    () => {
      const root = rootRef.current
      if (!root) return

      if (prefersReducedMotion()) {
        showAll(root)
        return
      }

      root.querySelectorAll<HTMLElement>('.cursor-feature-section').forEach(setupSection)
    },
    [],
    rootRef,
  )
}
