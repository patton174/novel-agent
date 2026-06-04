import { useEffect, useRef, useState } from 'react'

export interface UseInViewRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export function useInViewReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewRevealOptions = {},
) {
  const { threshold = 0.12, rootMargin = '0px 0px -8% 0px', once = true } = options
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, visible }
}
