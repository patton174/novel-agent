import type Lenis from 'lenis'

export function marketingScrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  const lenis = (window as Window & { __lenis?: Lenis }).__lenis
  if (lenis) {
    lenis.scrollTo(el, { offset: -72, duration: 1.35 })
    return
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
