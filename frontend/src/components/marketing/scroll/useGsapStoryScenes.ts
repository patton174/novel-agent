import { gsap } from 'gsap'
import type { RefObject } from 'react'
import { prefersReducedMotion, useMarketingGsapEffect } from './useMarketingGsapEffect'

const SCRUB = 0.35
const START = 'top 72px'

function pinTimeline(section: HTMLElement, pin: HTMLElement, end = '+=300%') {
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

function revealCopy(tl: gsap.core.Timeline, copy: HTMLElement | null, at = 0) {
  if (!copy) return
  gsap.set(copy, { opacity: 0, y: 52, filter: 'blur(6px)' })
  tl.to(
    copy,
    { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out', duration: 0.2 },
    at,
  )
}

function revealApp(tl: gsap.core.Timeline, app: HTMLElement | null, at = 0.06) {
  if (!app) return
  gsap.set(app, { opacity: 0, y: 40, scale: 0.92, rotateX: 10, transformPerspective: 1200 })
  tl.to(
    app,
    {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      ease: 'power3.out',
      duration: 0.26,
    },
    at,
  )
}

function revealUserMsg(tl: gsap.core.Timeline, section: HTMLElement, at: number) {
  const msg = section.querySelector<HTMLElement>('.demo-user-msg')
  if (!msg) return
  gsap.set(msg, { opacity: 0, x: 24, scale: 0.96 })
  tl.to(msg, { opacity: 1, x: 0, scale: 1, duration: 0.16, ease: 'power2.out' }, at)
}

function revealLines(
  tl: gsap.core.Timeline,
  lines: NodeListOf<HTMLElement> | HTMLElement[],
  at: number,
  stagger = 0.08,
) {
  if (!lines.length) return
  gsap.set(lines, { opacity: 0, y: 14, clipPath: 'inset(0 100% 0 0)' })
  tl.to(
    lines,
    {
      opacity: 1,
      y: 0,
      clipPath: 'inset(0 0% 0 0)',
      stagger,
      ease: 'power2.out',
      duration: 0.16,
    },
    at,
  )
}

function focusAgentPane(tl: gsap.core.Timeline, section: HTMLElement, at: number) {
  const agentCol = section.querySelector<HTMLElement>('[data-demo-agent-pane]')
  const editor = section.querySelector<HTMLElement>('[data-demo-editor-pane]')
  if (agentCol) {
    tl.fromTo(
      agentCol,
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.05)', duration: 0.2, ease: 'power1.inOut' },
      at,
    )
  }
  if (editor) {
    tl.to(editor, { opacity: 0.78, duration: 0.2, ease: 'power1.inOut' }, at)
  }
}

const SHOW_ALL_SELECTOR = [
  '.story-copy',
  '.demo-app-mock',
  '.demo-agent-console',
  '.demo-user-msg',
  '.demo-think-line',
  '.demo-think-cursor',
  '.demo-think-tail',
  '.demo-tool-row',
  '.demo-sub-tool-row',
  '.demo-subagent-wrap',
  '.demo-subagent-inner',
  '.demo-stream-line',
  '.demo-stream-cursor',
  '.demo-stream-tail',
  '.demo-orch-header',
  '.demo-parent-tool',
  '.demo-stream-block',
  '.demo-editor-line',
  '.demo-editor-stream',
  '.demo-editor-tail',
].join(', ')

function showAll(root: HTMLElement) {
  const all = root.querySelectorAll(SHOW_ALL_SELECTOR)
  gsap.set(all, { opacity: 1, x: 0, y: 0, scale: 1, clearProps: 'all' })
  root
    .querySelectorAll('[data-demo-editor-pane], [data-demo-agent-pane]')
    .forEach((el) => gsap.set(el, { opacity: 1, filter: 'none', clearProps: 'all' }))
}

function setupThink(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>('#story-think')
  if (!section) return
  const pin = section.querySelector<HTMLElement>('.story-pin')
  const copy = section.querySelector<HTMLElement>('.story-copy')
  const app = section.querySelector<HTMLElement>('.demo-app-mock')
  const lines = section.querySelectorAll<HTMLElement>('.demo-think-line:not(.demo-think-tail)')
  const tail = section.querySelector<HTMLElement>('.demo-think-tail')
  const cursor = section.querySelector<HTMLElement>('.demo-think-cursor')
  if (!pin) return

  gsap.set(tail, { opacity: 0 })
  gsap.set(cursor, { opacity: 0 })

  const tl = pinTimeline(section, pin)

  revealCopy(tl, copy)
  revealApp(tl, app)
  revealUserMsg(tl, section, 0.12)
  focusAgentPane(tl, section, 0.18)
  revealLines(tl, lines, 0.2, 0.09)
  tl.to(tail, { opacity: 1, duration: 0.14, ease: 'power2.out' }, 0.58)
  tl.to(cursor, { opacity: 1, duration: 0.1 }, 0.64)
  tl.to(cursor, { opacity: 0, duration: 0.06, repeat: 5, yoyo: true, ease: 'steps(1)' }, 0.66)
}

function setupOrchestrate(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>('#story-orchestrate')
  if (!section) return
  const pin = section.querySelector<HTMLElement>('.story-pin')
  const copy = section.querySelector<HTMLElement>('.story-copy')
  const app = section.querySelector<HTMLElement>('.demo-app-mock')
  const header = section.querySelector<HTMLElement>('.demo-orch-header')
  const rows = section.querySelectorAll<HTMLElement>('.demo-tool-row')
  if (!pin) return

  gsap.set(header, { opacity: 0, y: 14 })
  gsap.set(rows, { opacity: 0, x: 36, clipPath: 'inset(0 0 0 100%)' })

  const tl = pinTimeline(section, pin)

  revealCopy(tl, copy)
  revealApp(tl, app)
  revealUserMsg(tl, section, 0.1)
  focusAgentPane(tl, section, 0.16)
  tl.to(header, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0.18)
  tl.to(
    rows,
    {
      opacity: 1,
      x: 0,
      clipPath: 'inset(0 0 0 0%)',
      stagger: 0.1,
      ease: 'power3.out',
      duration: 0.2,
    },
    0.28,
  )
  const lastDot = rows[rows.length - 1]?.querySelector('.lead > span')
  if (lastDot) {
    tl.fromTo(
      lastDot,
      { scale: 0.7 },
      { scale: 1.3, duration: 0.1, yoyo: true, repeat: 4, ease: 'power1.inOut' },
      0.54,
    )
  }
}

function setupSubagent(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>('#story-subagent')
  if (!section) return
  const pin = section.querySelector<HTMLElement>('.story-pin')
  const copy = section.querySelector<HTMLElement>('.story-copy')
  const app = section.querySelector<HTMLElement>('.demo-app-mock')
  const parent = section.querySelector<HTMLElement>('.demo-parent-tool')
  const wrap = section.querySelector<HTMLElement>('.demo-subagent-wrap')
  const inner = section.querySelectorAll<HTMLElement>('.demo-sub-tool-row')
  if (!pin) return

  gsap.set(parent, { opacity: 0, x: 24 })
  gsap.set(wrap, { opacity: 0, y: 32, scale: 0.94 })
  gsap.set(inner, { opacity: 0, x: 20 })

  const tl = pinTimeline(section, pin)

  revealCopy(tl, copy)
  revealApp(tl, app)
  revealUserMsg(tl, section, 0.1)
  focusAgentPane(tl, section, 0.16)
  tl.to(parent, { opacity: 1, x: 0, duration: 0.18, ease: 'power2.out' }, 0.2)
  tl.to(wrap, { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'back.out(1.35)' }, 0.32)
  tl.to(
    inner,
    {
      opacity: 1,
      x: 0,
      stagger: 0.13,
      ease: 'power3.out',
      duration: 0.18,
    },
    0.42,
  )
}

function setupStream(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>('#story-stream')
  if (!section) return
  const pin = section.querySelector<HTMLElement>('.story-pin')
  const copy = section.querySelector<HTMLElement>('.story-copy')
  const app = section.querySelector<HTMLElement>('.demo-app-mock')
  const block = section.querySelector<HTMLElement>('.demo-stream-block')
  const agentLines = section.querySelectorAll<HTMLElement>(
    '.demo-stream-line:not(.demo-stream-tail)',
  )
  const editorLines = section.querySelectorAll<HTMLElement>(
    '.demo-editor-stream, .demo-editor-tail',
  )
  const tail = section.querySelector<HTMLElement>('.demo-stream-tail')
  const editorTail = section.querySelector<HTMLElement>('.demo-editor-tail')
  const cursor = section.querySelector<HTMLElement>('.demo-stream-cursor')
  if (!pin) return

  gsap.set(block, { opacity: 0, scale: 0.94 })
  gsap.set(tail, { opacity: 0 })
  gsap.set(editorTail, { opacity: 0 })
  gsap.set(cursor, { opacity: 0 })

  const tl = pinTimeline(section, pin, '+=320%')

  revealCopy(tl, copy)
  revealApp(tl, app)
  revealUserMsg(tl, section, 0.08)
  tl.to(block, { opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' }, 0.14)
  revealLines(tl, agentLines, 0.22, 0.09)
  revealLines(tl, editorLines, 0.28, 0.1)
  tl.to(tail, { opacity: 1, duration: 0.12 }, 0.64)
  tl.to(editorTail, { opacity: 1, duration: 0.12 }, 0.66)
  tl.to(cursor, { opacity: 1, duration: 0.1 }, 0.72)
  tl.to(cursor, { opacity: 0, duration: 0.05, repeat: 6, yoyo: true, ease: 'steps(1)' }, 0.74)
}

export function useGsapStoryScenes(rootRef: RefObject<HTMLElement | null>) {
  useMarketingGsapEffect(
    () => {
      const root = rootRef.current
      if (!root) return

      if (prefersReducedMotion()) {
        showAll(root)
        return
      }

      setupThink(root)
      setupOrchestrate(root)
      setupSubagent(root)
      setupStream(root)
    },
    [],
    rootRef,
  )
}
