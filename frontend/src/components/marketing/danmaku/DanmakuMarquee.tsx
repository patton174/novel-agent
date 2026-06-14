import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { SiteDanmaku } from '@/api/billingApi'
import { useAppMobile } from '@/hooks/useMediaQuery'

const DESKTOP_TRACKS = 4
const MOBILE_TRACKS = 2
const DESKTOP_MIN_GAP = 140
const MOBILE_MIN_GAP = 220
const MIN_SPEED = 72
const MAX_SPEED = 110
const ITEM_CLASS_DESKTOP =
  'pointer-events-none absolute top-0 flex items-center whitespace-nowrap rounded-full border border-indigo-300/20 bg-gradient-to-r from-white/[0.12] to-indigo-500/[0.08] px-4 py-1.5 text-sm shadow-[0_8px_32px_rgba(79,70,229,0.25)] backdrop-blur-md'
const ITEM_CLASS_MOBILE =
  'pointer-events-none absolute top-0 flex items-center whitespace-nowrap rounded-full border border-indigo-300/20 bg-slate-900/90 px-4 py-1.5 text-sm shadow-[0_8px_32px_rgba(15,23,42,0.2)]'

interface FlyItem {
  uid: string
  label: string
  message: string
  track: number
  x: number
  speed: number
  width: number
}

function formatLabel(item: SiteDanmaku): string {
  return item.region ? `${item.authorName} · ${item.region}` : item.authorName
}

function estimateWidth(text: string): number {
  return Math.min(680, 80 + text.length * 14)
}

function buildItemEl(item: FlyItem, itemClass: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = itemClass
  el.dataset.uid = item.uid
  el.innerHTML = `<span class="mr-2 font-medium text-indigo-200">${escapeHtml(item.label)}</span><span class="text-slate-100">${escapeHtml(item.message)}</span>`
  el.style.willChange = 'transform'
  return el
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function DanmakuMarquee({
  pool,
  onPoolLow,
}: {
  pool: SiteDanmaku[]
  onPoolLow?: () => void
}) {
  const isMobile = useAppMobile()
  const reduced = useReducedMotion()
  const trackCount = isMobile ? MOBILE_TRACKS : DESKTOP_TRACKS
  const minGap = isMobile ? MOBILE_MIN_GAP : DESKTOP_MIN_GAP
  const itemClass = isMobile ? ITEM_CLASS_MOBILE : ITEM_CLASS_DESKTOP
  const rootRef = useRef<HTMLDivElement>(null)
  const poolRef = useRef(pool)
  const poolCursorRef = useRef(0)
  const lanesRef = useRef<FlyItem[][]>(Array.from({ length: trackCount }, () => []))
  const nodesRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const lowTriggeredRef = useRef(false)
  const startedRef = useRef(false)

  poolRef.current = pool

  useEffect(() => {
    lowTriggeredRef.current = false
  }, [pool.length])

  useEffect(() => {
    nodesRef.current.forEach((el) => el.remove())
    nodesRef.current.clear()
    lanesRef.current = Array.from({ length: trackCount }, () => [])
    startedRef.current = false
  }, [trackCount])

  useEffect(() => {
    if (reduced) return
    if (pool.length === 0) return
    const root = rootRef.current
    if (!root) return

    if (!startedRef.current) {
      startedRef.current = true
      poolCursorRef.current = 0
      lowTriggeredRef.current = false
    }

    let raf = 0
    let last = performance.now()
    let alive = true
    let running = false
    let pageVisible = !document.hidden
    let inViewport = true

    const takeNext = (): SiteDanmaku => {
      const list = poolRef.current
      const item = list[poolCursorRef.current % list.length]
      poolCursorRef.current += 1
      if (
        list.length >= 4 &&
        poolCursorRef.current > 0 &&
        poolCursorRef.current % list.length === Math.floor(list.length * 0.6) &&
        !lowTriggeredRef.current
      ) {
        lowTriggeredRef.current = true
        onPoolLow?.()
      }
      return item
    }

    const spawn = (track: number, containerW: number): FlyItem => {
      const src = takeNext()
      const label = formatLabel(src)
      const message = src.message
      const text = `${label} ${message}`
      return {
        uid: `${src.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label,
        message,
        track,
        x: containerW + 40 + Math.random() * 120,
        speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
        width: estimateWidth(text),
      }
    }

    const syncDom = () => {
      const active = new Set<string>()
      for (const lane of lanesRef.current) {
        for (const item of lane) {
          active.add(item.uid)
          let el = nodesRef.current.get(item.uid)
          if (!el) {
            el = buildItemEl(item, itemClass)
            root.appendChild(el)
            nodesRef.current.set(item.uid, el)
          }
          el.style.transform = `translate3d(${item.x}px, ${item.track * 52 + 8}px, 0)`
        }
      }
      nodesRef.current.forEach((el, uid) => {
        if (!active.has(uid)) {
          el.remove()
          nodesRef.current.delete(uid)
        }
      })
    }

    const stopLoop = () => {
      if (!running) return
      running = false
      cancelAnimationFrame(raf)
    }

    const tick = (now: number) => {
      if (!alive || !running) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = root.offsetWidth || window.innerWidth

      for (let t = 0; t < trackCount; t += 1) {
        const lane = lanesRef.current[t]
        for (const item of lane) {
          item.x -= item.speed * dt
        }
        lanesRef.current[t] = lane.filter((item) => item.x + item.width > -80)

        const laneNow = lanesRef.current[t]
        const tail = laneNow[laneNow.length - 1]
        if (laneNow.length === 0 || !tail || tail.x < w - minGap) {
          laneNow.push(spawn(t, w))
        }
      }

      syncDom()
      raf = requestAnimationFrame(tick)
    }

    const startLoop = () => {
      if (running || !alive) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }

    const reconcileLoop = () => {
      if (pageVisible && inViewport) {
        startLoop()
      } else {
        stopLoop()
      }
    }

    const onVisibilityChange = () => {
      pageVisible = !document.hidden
      reconcileLoop()
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewport = Boolean(entry?.isIntersecting)
        reconcileLoop()
      },
      { threshold: [0, 0.05, 0.15] },
    )
    io.observe(root)
    document.addEventListener('visibilitychange', onVisibilityChange)

    if (lanesRef.current.every((l) => l.length === 0)) {
      const w = root.offsetWidth || window.innerWidth
      for (let t = 0; t < trackCount; t += 1) {
        lanesRef.current[t].push(spawn(t, w))
      }
    }

    reconcileLoop()
    return () => {
      alive = false
      stopLoop()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [pool.length, onPoolLow, trackCount, minGap, itemClass, reduced])

  useEffect(() => {
    return () => {
      nodesRef.current.forEach((el) => el.remove())
      nodesRef.current.clear()
      lanesRef.current = Array.from({ length: trackCount }, () => [])
      startedRef.current = false
    }
  }, [trackCount])

  if (reduced) {
    const staticItems = pool.slice(0, Math.min(pool.length, 4))
    return (
      <div className="relative flex h-full w-full flex-col justify-center gap-2 overflow-hidden px-6" aria-live="off">
        {staticItems.map((item) => (
          <div
            key={item.id}
            className="pointer-events-none flex w-fit max-w-full items-center rounded-full border border-indigo-300/20 bg-slate-900/90 px-4 py-1.5 text-sm shadow-[0_8px_32px_rgba(15,23,42,0.2)]"
          >
            <span className="mr-2 truncate font-medium text-indigo-200">{formatLabel(item)}</span>
            <span className="truncate text-slate-100">{item.message}</span>
          </div>
        ))}
      </div>
    )
  }

  return <div ref={rootRef} className="relative h-full w-full overflow-hidden" aria-live="off" />
}
