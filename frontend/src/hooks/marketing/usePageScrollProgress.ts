import { useEffect, useState } from 'react'

function readProgress() {
  const lenis = (window as Window & { __lenis?: { scroll: number } }).__lenis
  const doc = document.documentElement
  const max = doc.scrollHeight - doc.clientHeight
  if (max <= 0) return 0
  const top = lenis ? lenis.scroll : doc.scrollTop
  return top / max
}

export function usePageScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const update = () => setProgress(readProgress())
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    const lenis = (window as Window & { __lenis?: { on: (e: string, fn: () => void) => void; off: (e: string, fn: () => void) => void } }).__lenis
    if (lenis) {
      lenis.on('scroll', onScroll)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (lenis) lenis.off('scroll', onScroll)
    }
  }, [])

  return progress
}
