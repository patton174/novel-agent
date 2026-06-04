import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

const SCROLLER = document.documentElement

type MarketingScrollContextValue = {
  lenis: Lenis | null
  /** Lenis + ScrollTrigger scrollerProxy 已就绪，可安全创建 scrub 动画 */
  scrollReady: boolean
}

const MarketingScrollContext = createContext<MarketingScrollContextValue>({
  lenis: null,
  scrollReady: false,
})

export function useMarketingScroll() {
  return useContext(MarketingScrollContext)
}

function wireLenisScrollTrigger(lenis: Lenis) {
  ScrollTrigger.scrollerProxy(SCROLLER, {
    scrollTop(value) {
      if (arguments.length) {
        lenis.scrollTo(value ?? 0, { immediate: true })
      }
      return lenis.scroll
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }
    },
  })

  ScrollTrigger.defaults({ scroller: SCROLLER })
  lenis.on('scroll', ScrollTrigger.update)
}

export function MarketingScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const [scrollReady, setScrollReady] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      ScrollTrigger.config({ limitCallbacks: true })
      setScrollReady(true)
      return () => setScrollReady(false)
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.35,
    })
    lenisRef.current = lenis
    ;(window as Window & { __lenis?: Lenis }).__lenis = lenis

    wireLenisScrollTrigger(lenis)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener('resize', onResize)

    const readyId = requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      requestAnimationFrame(() => {
        ScrollTrigger.refresh()
        setScrollReady(true)
      })
    })

    return () => {
      cancelAnimationFrame(readyId)
      setScrollReady(false)
      window.removeEventListener('resize', onResize)
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisRef.current = null
      delete (window as Window & { __lenis?: Lenis }).__lenis
      ScrollTrigger.scrollerProxy(SCROLLER, {})
      ScrollTrigger.getAll().forEach((st) => st.kill())
    }
  }, [])

  return (
    <MarketingScrollContext.Provider
      value={{ lenis: lenisRef.current, scrollReady }}
    >
      {children}
    </MarketingScrollContext.Provider>
  )
}
