export function marketingScrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: 'smooth' })
}
