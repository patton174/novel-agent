import { useEffect, useRef } from 'react'
import type { SiteDanmaku } from '@/api/billingApi'
import { useAppMobile } from '@/hooks/useMediaQuery'

// 密度降低（性能优化）：DOM 数量决定 layout/rAF 开销
// 桌面：2 轨道，移动：1 轨道；间距加大降低瞬时 DOM 数
const DESKTOP_TRACKS = 2
const MOBILE_TRACKS = 1
const DESKTOP_MIN_GAP = 320
const MOBILE_MIN_GAP = 360
// 速度区间整体下调 30~40%，减少 layout 触发频次
const MIN_SPEED = 44
const MAX_SPEED = 68
const ITEM_CLASS =
  'pointer-events-none absolute top-0 flex items-center whitespace-nowrap border-2 border-black bg-white px-3 py-1 font-mono text-xs shadow-[2px_2px_0px_0px_#000000]'

interface FlyItem {
  uid: string
  /** 去重键 = `${authorName}|${message}`，用于"同时不重复"过滤 */
  dedupKey: string
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

function dedupKeyOf(item: SiteDanmaku): string {
  return `${item.authorName}|${item.message}`
}

function estimateWidth(text: string): number {
  // 紧凑：每字符 ~10px（font-xs），最大 480px（之前 680）
  return Math.min(480, 60 + text.length * 10)
}

function buildItemEl(item: FlyItem): HTMLDivElement {
  const el = document.createElement('div')
  el.className = ITEM_CLASS
  el.dataset.uid = item.uid
  el.innerHTML = `<span class="mr-2 font-bold text-primary">${escapeHtml(item.label)}</span><span class="font-bold text-ink">${escapeHtml(item.message)}</span>`
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
  const trackCount = isMobile ? MOBILE_TRACKS : DESKTOP_TRACKS
  const minGap = isMobile ? MOBILE_MIN_GAP : DESKTOP_MIN_GAP
  const rootRef = useRef<HTMLDivElement>(null)
  const poolRef = useRef(pool)
  const poolCursorRef = useRef(0)
  const lanesRef = useRef<FlyItem[][]>(Array.from({ length: trackCount }, () => []))
  const nodesRef = useRef<Map<string, HTMLDivElement>>(new Map())
  // 当前在屏弹幕的去重键集合（按 authorName+message 区分），同一时刻不重复
  const activeKeysRef = useRef<Set<string>>(new Set())
  const lowTriggeredRef = useRef(false)
  const startedRef = useRef(false)
  const onPoolLowRef = useRef(onPoolLow)

  poolRef.current = pool
  onPoolLowRef.current = onPoolLow

  useEffect(() => {
    lowTriggeredRef.current = false
  }, [pool.length])

  useEffect(() => {
    nodesRef.current.forEach((el) => el.remove())
    nodesRef.current.clear()
    lanesRef.current = Array.from({ length: trackCount }, () => [])
    activeKeysRef.current.clear()
    startedRef.current = false
  }, [trackCount])

  useEffect(() => {
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

    /**
     * 取下一条弹幕。
     * 规则：从 cursor 开始扫整个 pool，跳过当前在屏（activeKeys 命中）的；
     *       找不到则返回 null（本帧不生成，绝不在屏上重复同一条）。
     *       同一时刻不重复，跨轮可重播。
     */
    const takeNext = (): SiteDanmaku | null => {
      const list = poolRef.current
      if (list.length === 0) return null
      const n = list.length
      for (let i = 0; i < n; i++) {
        const idx = (poolCursorRef.current + i) % n
        const candidate = list[idx]
        if (!activeKeysRef.current.has(dedupKeyOf(candidate))) {
          poolCursorRef.current = (idx + 1) % n
          if (
            list.length >= 4 &&
            poolCursorRef.current > 0 &&
            poolCursorRef.current % list.length === Math.floor(list.length * 0.6) &&
            !lowTriggeredRef.current
          ) {
            lowTriggeredRef.current = true
            onPoolLowRef.current?.()
          }
          return candidate
        }
      }
      // 全部都在屏（pool 极少如只有 1 条）→ 不生成，宁可空一格也不同屏重复
      return null
    }

    const spawn = (track: number, containerW: number): FlyItem | null => {
      const src = takeNext()
      if (!src) return null
      const label = formatLabel(src)
      const message = src.message
      const text = `${label} ${message}`
      const key = dedupKeyOf(src)
      activeKeysRef.current.add(key)
      return {
        uid: `${src.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dedupKey: key,
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
            el = buildItemEl(item)
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

    const tick = (now: number) => {
      if (!alive) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = root.offsetWidth || window.innerWidth

      for (let t = 0; t < trackCount; t += 1) {
        const lane = lanesRef.current[t]
        for (const item of lane) {
          item.x -= item.speed * dt
        }
        // 出屏：释放去重键（让它/同 key 项能在后续轮次再次出现）
        lanesRef.current[t] = lane.filter((item) => {
          if (item.x + item.width <= -80) {
            activeKeysRef.current.delete(item.dedupKey)
            return false
          }
          return true
        })

        const laneNow = lanesRef.current[t]
        const tail = laneNow[laneNow.length - 1]
        if (laneNow.length === 0 || !tail || tail.x < w - minGap) {
          const item = spawn(t, w)
          if (item) laneNow.push(item)
          // spawn 返回 null（pool 全在屏）→ 本帧不生成，保持空轨道
        }
      }

      syncDom()
      raf = requestAnimationFrame(tick)
    }

    if (lanesRef.current.every((l) => l.length === 0)) {
      const w = root.offsetWidth || window.innerWidth
      for (let t = 0; t < trackCount; t += 1) {
        const item = spawn(t, w)
        if (item) lanesRef.current[t].push(item)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [pool.length, trackCount, minGap])

  useEffect(() => {
    return () => {
      nodesRef.current.forEach((el) => el.remove())
      nodesRef.current.clear()
      lanesRef.current = Array.from({ length: trackCount }, () => [])
      activeKeysRef.current.clear()
      startedRef.current = false
    }
  }, [trackCount])

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden" aria-live="off">
      {/* 左右两侧渐隐蒙版：弹幕进出视口时自然淡入淡出，避免硬裁切 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-ink to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-ink to-transparent md:w-32" />
    </div>
  )
}
