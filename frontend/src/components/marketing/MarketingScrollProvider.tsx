import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

gsap.registerPlugin(ScrollTrigger)

type MarketingScrollContextValue = {
  /** ScrollTrigger 已就绪，可安全创建滚动动画 */
  scrollReady: boolean
}

const MarketingScrollContext = createContext<MarketingScrollContextValue>({
  scrollReady: false,
})

export function useMarketingScroll() {
  return useContext(MarketingScrollContext)
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

/** 合并多次 refresh，避免滚动过程中反复重算布局 */
export function scheduleScrollTriggerRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    ScrollTrigger.refresh()
  }, 120)
}

export function MarketingScrollProvider({ children }: { children: ReactNode }) {
  const [scrollReady, setScrollReady] = useState(false)

  useEffect(() => {
    ScrollTrigger.config({ limitCallbacks: true })
    ScrollTrigger.defaults({ scroller: window })

    const onResize = () => scheduleScrollTriggerRefresh()
    window.addEventListener('resize', onResize, { passive: true })

    const readyId = requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      setScrollReady(true)
    })

    return () => {
      cancelAnimationFrame(readyId)
      setScrollReady(false)
      window.removeEventListener('resize', onResize)
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
    }
  }, [])

  return (
    <MarketingScrollContext.Provider value={{ scrollReady }}>
      {children}
    </MarketingScrollContext.Provider>
  )
}
