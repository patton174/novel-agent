import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useThemeStore } from '@/stores/themeStore'
import { font } from '@/styles/theme'
import { sampleTextPoints } from './PixelText'
import { cn } from '@/lib/utils'

/**
 * PixelField —— 交互式像素点阵字（canvas）。
 *
 * 把每个字形亮点画到 canvas，鼠标靠近时点被「牵引」向光标位移（弹性回弹），离开回弹。
 *
 * 自适应密度（autoDensity，默认开）：字体越大，按「目标点尺寸 targetDot」反推更高的
 * 采样分辨率 effCell（**始终取整**，避免分数 cell 破坏网格索引导致空采样），使每个亮点
 * 屏幕尺寸趋近 targetDot——点更密、不随字体放大而稀疏。拉伸场（stretchY>1）按长轴对齐
 * targetDot，保证拉伸后仍密集。
 *
 * 噪点艺术化（noiseSeed）：每个实例挂载时生成独立 seed，传给 sampleTextPoints →
 * 字形边缘像素带合理抖动（不规则但可识别），同一实例内稳定，不同实例不同。
 *
 * CRT 故障效果（CRT Glitch / Distortion）：
 *   - 鼠标快速划过时按速度比例水平撕裂像素块（最多 ±75px，作用域 ~260px）
 *   - 停止后按 (1-t)² ease-out 衰减（"先快后慢"恢复）
 *   - 自动每 1s 一次水平撕裂（位置/方向随机，幅度 28–55px，作用域独立）
 *   - 模拟老式显像管的画面拉扯缺陷
 *
 * 性能：单 canvas + 一个 rAF；点位缓存；超 maxPoints 抽样；无鼠标且归位且无撕裂时停帧。
 * prefers-reduced-motion：静态绘制，无撕裂。
 */
export interface PixelFieldProps {
  text: string
  /** 采样分辨率基准（点轴数，整数）。autoDensity 开时作为初始/下限参考。默认 24 */
  cell?: number
  color?: string
  fontWeight?: number
  fontFamily?: string
  threshold?: number
  glyphGap?: number
  /** 单词间距（源像素）。空格占据的横向距离，应明显大于 glyphGap。
   *  默认 = cell（1 个字符宽度），产生清晰的"单词间有缝"视觉。 */
  wordGap?: number
  /** 牵引半径（屏幕 px）。默认 110 */
  attractRadius?: number
  /** 牵引强度 0-1。默认 0.85 */
  attractStrength?: number
  /** 回弹/插值速度 0-1。默认 0.18 */
  ease?: number
  /** 点数上限（超出抽样）。默认 20000 */
  maxPoints?: number
  /** 垂直拉伸倍数。默认 1 */
  stretchY?: number
  /** 直接指定每点像素大小。设了则不铺满、不自适应密度。默认 undefined */
  dot?: number
  /** 按父级高度占比铺字（父级须有确定高度）。默认 undefined */
  fillHeight?: number
  /** 自适应密度：按字体大小自动提高采样分辨率，保持点不稀疏。默认 true */
  autoDensity?: boolean
  /** 目标点尺寸（屏幕 px）。默认 5 */
  targetDot?: number
  /** 自适应密度的采样分辨率上下限（整数，必须是 7 的倍数）。
   *  默认 [14, 77] → 最小 14（每原像素 2×2 块）、最大 77（每原像素 11×11 块） */
  cellRange?: [number, number]
  className?: string
  ariaLabel?: string
}

interface Dot {
  bx: number
  by: number
  dx: number
  dy: number
  tx: number
  ty: number
}

export function PixelField({
  text,
  cell = 24,
  color,
  fontWeight = 900,
  fontFamily = font.body,
  threshold = 90,
  glyphGap = 1,
  wordGap,
  attractRadius = 110,
  attractStrength = 0.85,
  ease = 0.18,
  maxPoints = 20000,
  stretchY = 1,
  dot: dotProp,
  fillHeight,
  autoDensity = true,
  targetDot = 5,
  cellRange = [14, 77],
  className,
  ariaLabel,
}: PixelFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const [resolvedColor, setResolvedColor] = useState<string | null>(color ?? null)

  // 噪点 seed：每个实例挂载时独立生成（不可 0，否则无噪点）
  const [noiseSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff) || 1)

  useLayoutEffect(() => {
    if (color) {
      setResolvedColor(color)
      return
    }
    const el = wrapRef.current
    if (!el) return
    setResolvedColor(getComputedStyle(el).color)
  }, [color, theme, className])

  // 参考采样（prop cell），估算线性系数 K = 源宽 / cell（近似常数）
  // refSampled 用 cell 采样，wordGap = cell 已能保证"1 字符宽" 比例
  const refSampled = useMemo(
    () => sampleTextPoints({ text, cell, weight: fontWeight, fontFamily, threshold, gap: glyphGap, wordGap, noiseSeed }),
    [text, cell, fontWeight, fontFamily, threshold, glyphGap, wordGap, noiseSeed],
  )
  const K = cell > 0 && refSampled.w > 0 ? refSampled.w / cell : 0

  // effCell（整数）：autoDensity 关闭时 = cell
  const [effCell, setEffCell] = useState(cell)
  // effDot：每点屏幕像素（整数坐标用，但保留小数以平滑）
  const [effDot, setEffDot] = useState(dotProp ?? 2)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || refSampled.w <= 0 || typeof window === 'undefined') return
    const parent = wrap.parentElement
    if (!parent) return

    const compute = () => {
      if (fillHeight != null) {
        const ph = parent.clientHeight
        const pw = parent.clientWidth
        if (ph <= 0 || pw <= 0) return
        if (autoDensity && K > 0) {
          // 长轴（拉伸后）对齐 targetDot：effCell = ph*fillHeight / (targetDot)
          const c = Math.round((ph * fillHeight) / targetDot)
          const ccRaw = clamp(c, cellRange[0], cellRange[1])
          // 强制对齐到 7 的倍数（5×7 字模方块对齐要求）
          const cc = clampToMultipleOf7(ccRaw, cellRange[0], cellRange[1])
          setEffCell(cc)
          // 源宽 ≈ K*cc，dot = ph*fillHeight / (cc*stretchY)
          setEffDot(Math.max(1, (ph * fillHeight) / (cc * stretchY)))
        } else {
          setEffCell(cell)
          setEffDot(Math.max(1, (ph * fillHeight) / (cell * stretchY)))
        }
        return
      }
      if (dotProp != null) {
        setEffCell(cell)
        setEffDot(dotProp)
        return
      }
      const pw = parent.clientWidth
      if (pw <= 0) return
      if (autoDensity && K > 0) {
        // 长轴对齐 targetDot：显示点长轴 = dot*stretchY ≈ targetDot → dot = targetDot/stretchY
        const desiredDot = targetDot / Math.max(1, stretchY)
        // effCell 使源宽 = K*cc，dot = pw/(K*cc) ≈ desiredDot → cc = pw/(K*desiredDot)
        const c = Math.round(pw / (K * desiredDot))
        const ccRaw = clamp(c, cellRange[0], cellRange[1])
        // 强制对齐到 7 的倍数（5×7 字模方块对齐要求）
        const cc = clampToMultipleOf7(ccRaw, cellRange[0], cellRange[1])
        setEffCell(cc)
        setEffDot(Math.max(1, pw / (K * cc)))
      } else {
        setEffCell(cell)
        setEffDot(Math.max(1, Math.min(8, pw / refSampled.w)))
      }
    }
    compute()
    const onResize = () => compute()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(compute)
    ro.observe(parent)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
    }
  }, [refSampled.w, K, dotProp, fillHeight, stretchY, autoDensity, targetDot, cell, cellRange])

  // 实际渲染采样（按整数 effCell）；effCell===cell 时复用 refSampled
  // wordGap 是「字符宽度的倍数」（以 cell 为基准 1）→ 按 effCell/cell 缩放，
  // 这样无论父容器多大，"词间距 = 1 个字符宽" 的比例都稳定。
  const effWordGap = wordGap == null
    ? cell
    : Math.max(1, Math.round(wordGap * (effCell / cell)))
  const sampled = useMemo(
    () =>
      effCell === cell
        ? refSampled
        : sampleTextPoints({ text, cell: effCell, weight: fontWeight, fontFamily, threshold, gap: glyphGap, wordGap: effWordGap, noiseSeed }),
    [effCell, cell, refSampled, text, fontWeight, fontFamily, threshold, glyphGap, effWordGap, noiseSeed],
  )

  // 抽样点位
  const dotsSrc = useMemo(() => {
    let pts = sampled.points
    if (pts.length > maxPoints) {
      const step = Math.ceil(pts.length / maxPoints)
      pts = pts.filter((_, i) => i % step === 0)
    }
    return pts
  }, [sampled.points, maxPoints])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 防御：采样为空则不绘制（避免 0 尺寸 canvas）
    if (sampled.w <= 0 || sampled.h <= 0 || effDot <= 0) return

    const dispW = sampled.w * effDot
    const dispH = sampled.h * effDot * stretchY
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = Math.max(1, Math.round(dispW * dpr))
    canvas.height = Math.max(1, Math.round(dispH * dpr))
    canvas.style.width = `${dispW}px`
    canvas.style.height = `${dispH}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const fill = resolvedColor || '#1a1a1a'
    const dotW = effDot
    const dotH = effDot * stretchY

    const dots: Dot[] = dotsSrc.map((p) => ({
      bx: p.x * effDot,
      by: p.y * effDot * stretchY,
      dx: 0,
      dy: 0,
      tx: 0,
      ty: 0,
    }))

    // ── 鼠标 & 撕裂 & 水波纹状态 ──
    let mouse: { x: number; y: number } | null = null
    let mouseVel = 0
    let mouseDX = 0
    let lastMouse: { x: number; y: number } | null = null
    let lastMouseTime = 0

    // 撕裂（鼠标快速划过）：事件驱动 + (1-t)² ease-out 衰减
    let tearTriggerAt = -Infinity
    let tearPeak = 0
    let tearDir = 1
    let tearX = 0
    let tearY = 0
    const TEAR_SCOPE_RADIUS = 260 // px（作用域：鼠标周围 ~260px 的点都会被波及）
    const TEAR_MAX_PX = 75 // 单点最大水平位移（峰值，再放大）
    const TEAR_DURATION = 950 // ms（持续时间）

    // 自动撕裂：每 1s 一次，随机位置，随机方向，作用域式衰减
    let autoTearTriggerAt = -Infinity
    let autoTearPeak = 0
    let autoTearDir = 1
    let autoTearX = 0
    let autoTearY = 0
    const AUTO_TEAR_INTERVAL_MS = 1000
    const AUTO_TEAR_PEAK_MIN = 28
    const AUTO_TEAR_PEAK_MAX = 55
    const AUTO_TEAR_DURATION = 700
    let autoTearTimer: number | null = null

    let raf = 0
    let running = false

    const draw = () => {
      ctx.clearRect(0, 0, dispW, dispH)
      ctx.fillStyle = fill
      let active = false
      const now = performance.now()

      // 鼠标撕裂位移（基于事件触发时间做 ease-out 衰减）
      let mouseTearAmt = 0
      const mouseTearElapsed = now - tearTriggerAt
      if (mouseTearElapsed < TEAR_DURATION && tearPeak > 0) {
        const t = mouseTearElapsed / TEAR_DURATION
        const decay = (1 - t) * (1 - t) // (1-t)² → "先快后慢"
        mouseTearAmt = tearPeak * decay * tearDir
      }

      // 自动撕裂位移（同样的 ease-out，但作用域独立、幅度更小）
      let autoTearAmt = 0
      const autoTearElapsed = now - autoTearTriggerAt
      if (autoTearElapsed < AUTO_TEAR_DURATION && autoTearPeak > 0) {
        const t = autoTearElapsed / AUTO_TEAR_DURATION
        const decay = (1 - t) * (1 - t)
        autoTearAmt = autoTearPeak * decay * autoTearDir
      }

      mouseVel *= 0.85
      mouseDX *= 0.85

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]

        // 鼠标吸引（原有逻辑）
        if (mouse) {
          const cx = d.bx + d.dx
          const cy = d.by + d.dy
          const ddx = mouse.x - cx
          const ddy = mouse.y - cy
          const dist = Math.hypot(ddx, ddy)
          if (dist < attractRadius) {
            const falloff = 1 - dist / attractRadius
            d.tx = ddx * attractStrength * falloff
            d.ty = ddy * attractStrength * falloff
          } else {
            d.tx = 0
            d.ty = 0
          }
        } else {
          d.tx = 0
          d.ty = 0
        }
        d.dx += (d.tx - d.dx) * ease
        d.dy += (d.ty - d.dy) * ease

        // 鼠标撕裂位移（作用域范围内）
        let tDx = 0
        if (Math.abs(mouseTearAmt) > 0.1) {
          const distToTear = Math.hypot(d.bx - tearX, d.by - tearY)
          if (distToTear < TEAR_SCOPE_RADIUS) {
            const scopeFalloff = 1 - distToTear / TEAR_SCOPE_RADIUS
            tDx = mouseTearAmt * scopeFalloff
          }
        }

        // 自动撕裂位移（作用域范围内，独立触发点）
        if (Math.abs(autoTearAmt) > 0.1) {
          const distToAuto = Math.hypot(d.bx - autoTearX, d.by - autoTearY)
          if (distToAuto < TEAR_SCOPE_RADIUS) {
            const scopeFalloff = 1 - distToAuto / TEAR_SCOPE_RADIUS
            tDx += autoTearAmt * scopeFalloff
          }
        }

        if (mouse || Math.abs(d.dx) > 0.3 || Math.abs(d.dy) > 0.3) active = true
        if (Math.abs(mouseTearAmt) > 0.1 || Math.abs(autoTearAmt) > 0.1) active = true
        ctx.fillRect(d.bx + d.dx + tDx, d.by + d.dy, dotW, dotH)
      }

      if (
        active ||
        mouse ||
        Math.abs(mouseTearAmt) > 0.1 ||
        Math.abs(autoTearAmt) > 0.1
      ) {
        raf = requestAnimationFrame(draw)
      } else {
        running = false
      }
    }

    const ensureRunning = () => {
      if (running || reduced) return
      running = true
      raf = requestAnimationFrame(draw)
    }

    // 调度自动撕裂（每 1s 一次，位置/方向随机）
    const scheduleAutoTear = () => {
      if (autoTearTimer != null) clearTimeout(autoTearTimer)
      autoTearTimer = window.setTimeout(() => {
        autoTearPeak = AUTO_TEAR_PEAK_MIN + Math.random() * (AUTO_TEAR_PEAK_MAX - AUTO_TEAR_PEAK_MIN)
        autoTearDir = Math.random() < 0.5 ? -1 : 1
        autoTearX = Math.random() * dispW
        autoTearY = Math.random() * dispH
        autoTearTriggerAt = performance.now()
        ensureRunning()
        scheduleAutoTear()
      }, AUTO_TEAR_INTERVAL_MS)
    }
    scheduleAutoTear()

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const now = performance.now()
      if (lastMouse) {
        const dt = now - lastMouseTime
        if (dt > 0 && dt < 100) {
          const dx = x - lastMouse.x
          const dy = y - lastMouse.y
          const dist = Math.hypot(dx, dy)
          mouseVel = (dist / dt) * 16
          mouseDX = (dx / dt) * 16
          if (mouseVel > 0.6 && Math.abs(mouseDX) > 0.35) {
            const peak = Math.min(TEAR_MAX_PX, mouseVel * 2)
            if (peak >= tearPeak * 0.6 || now - tearTriggerAt > 200) {
              tearPeak = peak
              tearTriggerAt = now
              tearDir = mouseDX > 0 ? 1 : -1
              tearX = mouse?.x ?? x
              tearY = y
            }
          }
        }
      }
      lastMouse = { x, y }
      lastMouseTime = now
      mouse = { x, y }
      ensureRunning()
    }
    const onLeave = () => {
      mouse = null
      lastMouse = null
      ensureRunning()
    }

    if (reduced) {
      ctx.clearRect(0, 0, dispW, dispH)
      ctx.fillStyle = fill
      for (const d of dots) ctx.fillRect(d.bx, d.by, dotW, dotH)
    } else {
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerleave', onLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      if (autoTearTimer != null) clearTimeout(autoTearTimer)
    }
  }, [dotsSrc, effDot, sampled.w, sampled.h, stretchY, resolvedColor, reduced, attractRadius, attractStrength, ease])

  return (
    <div
      ref={wrapRef}
      className={cn(
        'pixel-field leading-none',
        dotProp != null || fillHeight != null ? 'inline-block' : 'block w-full',
        className,
      )}
      role="img"
      aria-label={ariaLabel ?? text}
    >
      <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
    </div>
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** 把任意整数 round 到最近的 7 倍数，并夹在 [lo, hi] 范围内 */
function clampToMultipleOf7(v: number, lo: number, hi: number): number {
  const r = Math.max(lo, Math.min(hi, Math.round(v / 7) * 7))
  // 防御：lo/hi 非 7 倍数时夹回去仍可能越界
  return r
}
