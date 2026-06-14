import { useEffect, useState } from 'react'
import { APP_MOBILE_MEDIA } from '@/lib/breakpoints'

/** 订阅 matchMedia，SSR 时返回 defaultValue */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return defaultValue
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** 全站移动断点（767px），与 Tailwind `max-md:` 一致 */
export function useAppMobile(): boolean {
  return useMediaQuery(APP_MOBILE_MEDIA)
}

/** @deprecated 使用 useAppMobile */
export function useEditorMobile(): boolean {
  return useAppMobile()
}
