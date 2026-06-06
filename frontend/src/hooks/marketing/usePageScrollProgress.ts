import { useEffect, useState } from 'react'

function readProgress() {
  const doc = document.documentElement
  const max = doc.scrollHeight - doc.clientHeight
  if (max <= 0) return 0
  return doc.scrollTop / max
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

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return progress
}
