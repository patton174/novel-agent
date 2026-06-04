import { useEffect, useRef, useState } from 'react'

/** 0 at scene top enters viewport, 1 when scene bottom leaves — for pinned scroll storytelling. */
export function useScrollSceneProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    const update = () => {
      const rect = el.getBoundingClientRect()
      const viewport = window.innerHeight
      const scrollable = rect.height - viewport
      if (scrollable <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0)
        return
      }
      const raw = -rect.top / scrollable
      setProgress(Math.min(1, Math.max(0, raw)))
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return { ref, progress }
}
