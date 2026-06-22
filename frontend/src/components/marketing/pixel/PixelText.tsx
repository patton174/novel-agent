import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThemeStore } from '@/stores/themeStore'
import { font } from '@/styles/theme'
import { cn } from '@/lib/utils'
import { getGlyph5x7, scaleUp5x7 } from './glyphs5x7'

/**
 * PixelText —— 通用「像素点封装字体」渲染器（高性能版）。
 *
 * 输入任意文字（含中文），把每个字形采样到网格上，再用 1px 方块点把
 * 「点亮」的格子画出来，得到真·点阵像素字。不依赖像素字体（Press Start 2P
 * 之类没有中文字形），中文也能渲染。
 *
 * 噪点艺术化（noiseSeed）：
 *   - 每个实例挂载时生成独立随机种子，使同一文字每次实例化噪点位置不同
 *   - 在字形 alpha 阈值前注入 ±NOISE_AMP 抖动，使边缘像素有几率翻转
 *   - 抖动受 seed + 字形双重约束：同一实例 + 同一字 → 稳定噪点；不同实例不同
 *   - 噪点幅度受限（±25 / 255）→ 字体仍可识别，仅轮廓毛糙化
 *
 * 性能策略（可在单页大量使用）：
 * 1. 字形采样结果按 `char|cell|weight|font|threshold|noiseSeed` 全局缓存
 * 2. 整段文字只画一次到一个离屏 canvas → 转 data-URI，按
 *    `text|cell|weight|font|color|threshold|gap|noiseSeed` 全局缓存
 * 3. 每个实例只是一个带 `background-image` 的 `<span>`——DOM 里没有 canvas、
 *    没有逐帧绘制；相同文字 + 相同 seed 复用同一张已解码图片，浏览器 GPU 合成
 * 4. 颜色解析后写入缓存 key，切暗色主题时按新颜色重新生成
 *
 * 点大小：源图每点 1px（最细），通过 `dot` 控制 CSS 放大倍数
 */

export type PixelTextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** cell = 采样网格分辨率（也是 dot=1 时的字形像素高度）。
 *  5×7 字模要求 cell 是 7 的倍数才能保持方块对齐 */
const SIZE_PRESET: Record<PixelTextSize, { cell: number }> = {
  xs: { cell: 7 },
  sm: { cell: 14 },
  md: { cell: 21 },
  lg: { cell: 28 },
  xl: { cell: 35 },
}

/** 噪点幅度：alpha ±35/255，整行统一抖动 → 横向出现 glitch 条纹，字形清晰 + 适度毛糙 */
const NOISE_AMP = 35

export interface PixelTextProps {
  text: string
  /** 预设采样分辨率（决定平滑度与 dot=1 时的字形高度） */
  size?: PixelTextSize
  /** 采样网格分辨率（每轴点数）。设了会覆盖 size */
  cell?: number
  /** 每个点在屏幕上的像素大小（源图恒为 1px/点）。默认 1 = 最细，适合大量使用 */
  dot?: number
  /** 字形之间的间隔（源像素，即 dot=1 时的 px）。默认 = cell/7（1 列字模宽度 ≈ 14% 字符宽）。
   *  5×7 查表路径：字身 5/7 cell + 1/7 cell 内置空白 = 6/7 cell；总字距 = 内置空白 + glyphGap。
   *  canvas 采样回退（中文/特殊字符）：字身 cell；总字距 = glyphGap。
   *  - 默认 → 约 14% 字符宽（5×7 路径内置空白）/ 14% 字符宽（中文回退 cell/7 间距） */
  glyphGap?: number
  /** 单词间距（源像素）。空格字符占据的横向距离。默认 = cell/2（≈ 半个字符宽度），
   *  明显大于 glyphGap=0 以产生"单词之间有缝"的视觉差异，但不会把单词撑到 1 字符宽那么散 */
  wordGap?: number
  /** 点的颜色；不传则从 className 的 currentColor 解析，随主题翻转 */
  color?: string
  /** 采样用的字重；越重点阵越满。默认 800 */
  fontWeight?: number
  /** 采样用的字体栈；默认与全站 body 对齐 */
  fontFamily?: string
  /** 判定点亮的 alpha 阈值 0-255。默认 90 */
  threshold?: number
  className?: string
  ariaLabel?: string
  /** 纯装饰：置为 true 时对辅助技术隐藏，避免与外层标签重复朗读 */
  presentational?: boolean
  /** 响应式铺满父级宽度：测量父级宽度，按比例放大 dot 使文字铺满，
   *  点保持正方形（不变形）。适合大标题。开启后忽略 dot。默认 false */
  fill?: boolean
  /** fill 模式下 dot 的上下限，避免极值。默认 [1, 6] */
  dotRange?: [number, number]
  /** fill 时水平对齐。默认 center */
  fillAlign?: 'left' | 'center' | 'right'
  /** fill 时优先完整显示文字：允许 dot 低于 dotRange[0] 以免裁切。默认 false */
  fillFit?: boolean
}

// ── 工具：mulberry32 风格的确定性随机（按 seed 输出 0-1 序列） ─────────
function makeRng(seed: number): () => number {
  let s = (seed | 0) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// ── 字形缓存：char → 布尔网格 ─────────────────────────────────────────
const glyphCache = new Map<string, Uint8Array>()
let samplerCanvas: HTMLCanvasElement | null = null
let samplerCtx: CanvasRenderingContext2D | null = null

function getSampler(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!samplerCanvas) {
    samplerCanvas = document.createElement('canvas')
    samplerCtx = samplerCanvas.getContext('2d', { willReadFrequently: true })
  }
  return samplerCtx
}

/**
 * 采样单字形为布尔网格。
 * @param noiseSeed 0 = 无噪点；非 0 = 按此 seed 注入每像素 ±NOISE_AMP alpha 抖动
 */
function sampleGlyph(
  ch: string,
  cell: number,
  weight: number,
  fontFamily: string,
  threshold: number,
  noiseSeed: number,
): Uint8Array {
  // 5×7 字模查表路径：命中 + cell 是 7 倍数 → 用查表位图（已手画，干净不叠加噪点）
  if (noiseSeed === 0) {
    const glyph = getGlyph5x7(ch)
    if (glyph && cell % 7 === 0) {
      return scaleUp5x7(glyph, cell)
    }
  }

  const key = `${ch}|${cell}|${weight}|${fontFamily}|${threshold}|${noiseSeed}`
  const cached = glyphCache.get(key)
  if (cached) return cached

  const grid = new Uint8Array(cell * cell)
  const ctx = getSampler()
  if (ctx) {
    samplerCanvas!.width = cell
    samplerCanvas!.height = cell
    ctx.clearRect(0, 0, cell, cell)
    ctx.fillStyle = '#ffffff'
    ctx.font = `${weight} ${Math.round(cell * 0.92)}px ${fontFamily}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(ch, cell / 2, cell / 2 + cell * 0.02)
    const { data } = ctx.getImageData(0, 0, cell, cell)
    if (noiseSeed !== 0) {
      // 只有纵向噪点：每一行用同一个 alpha 抖动，整行同步翻转 → 横向 glitch 条纹。
      // 比逐像素抖动更「大条」、更粗犷，符合「大胆艺术化」诉求。
      const rng = makeRng(noiseSeed ^ hashStr(ch) ^ 0x9e3779b9)
      const rowOffsets = new Int8Array(cell)
      for (let y = 0; y < cell; y++) {
        // 偏移范围 [-NOISE_AMP, +NOISE_AMP]；用 round 落到整数值，避免抖动偏置
        rowOffsets[y] = Math.round((rng() - 0.5) * 2 * NOISE_AMP)
      }
      for (let y = 0; y < cell; y++) {
        const off = rowOffsets[y]
        for (let x = 0; x < cell; x++) {
          const i = y * cell + x
          const alpha = data[i * 4 + 3] + off
          grid[i] = alpha > threshold ? 1 : 0
        }
      }
    } else {
      for (let i = 0; i < cell * cell; i++) {
        grid[i] = data[i * 4 + 3] > threshold ? 1 : 0
      }
    }
  }
  glyphCache.set(key, grid)
  return grid
}

// ── 整串图像缓存：text → { url, w, h } ───────────────────────────────
interface CachedImage {
  url: string
  w: number
  h: number
}
const imageCache = new Map<string, CachedImage>()
let composerCanvas: HTMLCanvasElement | null = null
let composerCtx: CanvasRenderingContext2D | null = null

function getComposer(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!composerCanvas) {
    composerCanvas = document.createElement('canvas')
    composerCtx = composerCanvas.getContext('2d')
  }
  return composerCtx
}

/**
 * 渲染整段文字到离屏 canvas 并转 data-URI。
 * @param noiseSeed 同 sampleGlyph
 */
function renderTextImage(
  text: string,
  cell: number,
  weight: number,
  fontFamily: string,
  threshold: number,
  gap: number,
  wordGap: number,
  color: string,
  noiseSeed: number,
): CachedImage {
  const key = `${text}|${cell}|${weight}|${fontFamily}|${threshold}|${gap}|${wordGap}|${color}|${noiseSeed}`
  const cached = imageCache.get(key)
  if (cached) return cached

  const chars = Array.from(text)
  const empty: CachedImage = { url: '', w: 0, h: 0 }
  if (chars.length === 0) {
    imageCache.set(key, empty)
    return empty
  }

  const glyphs = chars.map((ch) => (ch === ' ' ? null : sampleGlyph(ch, cell, weight, fontFamily, threshold, noiseSeed)))

  const ctx = getComposer()
  if (!ctx) {
    imageCache.set(key, empty)
    return empty
  }
  // 字身宽：
  //   - 5×7 查表命中 = 6 列（5 笔画 + 1 内置空白）
  //   - canvas 采样回退（中文/特殊字符）= cell 列
  // 这样英文与中文混排时字符宽度比例合理、字距稳定。
  const glyph5x7Body = Math.round((cell * 6) / 7) // 5×7 路径字身 ≈ 6/7 cell
  // 计算总宽（空格按 wordGap 推进；非空字之间按字身 + gap 推进）
  let advance = 0
  chars.forEach((ch, i) => {
    if (ch === ' ') {
      advance += wordGap
      return
    }
    const body = getGlyph5x7(ch) ? glyph5x7Body : cell
    advance += body
    if (i < chars.length - 1 && chars[i + 1] !== ' ') advance += gap
  })
  const w = Math.max(advance, cell)
  const h = cell
  composerCanvas!.width = w
  composerCanvas!.height = h
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = color
  let ox = 0
  chars.forEach((ch, i) => {
    if (ch === ' ') {
      ox += wordGap
      return
    }
    const grid = glyphs[i]!
    const body = getGlyph5x7(ch) ? glyph5x7Body : cell
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < body; x++) {
        if (grid[y * cell + x]) ctx.fillRect(ox + x, y, 1, 1)
      }
    }
    ox += body
    // 非末字、且下一字非空格时加 gap
    if (i < chars.length - 1 && chars[i + 1] !== ' ') ox += gap
  })

  const url = composerCanvas!.toDataURL('image/png')
  const img: CachedImage = { url, w, h }
  // 缓存上限保护：超出时整体清空（极端情况，正常不会触达）
  if (imageCache.size > 2000) imageCache.clear()
  imageCache.set(key, img)
  return img
}

/**
 * 采样整段文字为「点亮点」坐标列表（源像素，dot=1）。供 PixelField 这类需要
 * 逐点操作的交互组件使用（位移、物理等），与渲染解耦。
 */
export function sampleTextPoints(opts: {
  text: string
  cell: number
  weight: number
  fontFamily: string
  threshold: number
  gap: number
  /** 单词间距（像素，默认 = cell）。应明显大于 gap 以产生"句子"分隔感 */
  wordGap?: number
  /** 噪点 seed（0=无噪点） */
  noiseSeed?: number
}): { points: { x: number; y: number }[]; w: number; h: number } {
  const { text, cell, weight, fontFamily, threshold, gap, wordGap = cell / 2, noiseSeed = 0 } = opts
  const chars = Array.from(text)
  if (chars.length === 0) return { points: [], w: 0, h: 0 }
  // 5×7 查表路径字身 ≈ 6/7 cell；canvas 采样回退（中文等）字身 = cell
  const glyph5x7Body = Math.round((cell * 6) / 7)
  const points: { x: number; y: number }[] = []
  let ox = 0
  chars.forEach((ch) => {
    if (ch === ' ') {
      ox += wordGap
      return
    }
    const grid = sampleGlyph(ch, cell, weight, fontFamily, threshold, noiseSeed)
    const body = getGlyph5x7(ch) ? glyph5x7Body : cell
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < body; x++) {
        if (grid[y * cell + x]) points.push({ x: ox + x, y })
      }
    }
    ox += body + gap
  })
  // 总宽 = 末字推进量 - 末尾多余 gap（若有字）
  const w = points.length > 0 ? Math.max(ox - gap, cell) : 0
  return { points, w, h: cell }
}

export function PixelText({
  text,
  size = 'md',
  cell,
  dot = 1,
  glyphGap = 0,
  wordGap,
  color,
  fontWeight = 800,
  fontFamily = font.body,
  threshold = 90,
  className,
  ariaLabel,
  presentational = false,
  fill = false,
  dotRange = [1, 6],
  fillAlign = 'center',
  fillFit = false,
}: PixelTextProps) {
  const cellSize = cell ?? SIZE_PRESET[size].cell
  // 单词间距默认 = cell/2（半个字符宽度），比字间 gap 大、但不会把单词撑到 1 字符宽那么散
  const effWordGap = wordGap ?? cellSize / 2
  const spanRef = useRef<HTMLSpanElement>(null)
  // 订阅主题：切换时重新解析 currentColor → 重新生成（命中新颜色的缓存）
  const theme = useThemeStore((s) => s.theme)
  const [resolvedColor, setResolvedColor] = useState<string | null>(color ?? null)

  // 噪点 seed：每个实例挂载时独立生成（不可 0，否则无噪点）
  const [noiseSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff) || 1)

  useLayoutEffect(() => {
    if (color) {
      setResolvedColor(color)
      return
    }
    const el = spanRef.current
    if (!el) return
    setResolvedColor(getComputedStyle(el).color)
  }, [color, theme, className])

  const img = useMemo(
    () =>
      resolvedColor
        ? renderTextImage(text, cellSize, fontWeight, fontFamily, threshold, glyphGap, effWordGap, resolvedColor, noiseSeed)
        : null,
    [text, cellSize, fontWeight, fontFamily, threshold, glyphGap, effWordGap, resolvedColor, noiseSeed],
  )

  // fill 模式：测量自身可用宽度（扣除父级 padding），按比例算 dot
  const [fillDot, setFillDot] = useState(dot)
  useLayoutEffect(() => {
    if (!fill) {
      setFillDot(dot)
      return
    }
    const el = spanRef.current
    if (!el) return
    const compute = () => {
      let pw = el.getBoundingClientRect().width
      if (pw <= 0 && el.parentElement) {
        const parent = el.parentElement
        const st = getComputedStyle(parent)
        pw =
          parent.clientWidth -
          (parseFloat(st.paddingLeft) || 0) -
          (parseFloat(st.paddingRight) || 0)
      }
      if (pw > 0 && img && img.w > 0) {
        const d = pw / img.w
        const fitted = fillFit
          ? Math.min(dotRange[1], d)
          : Math.min(dotRange[1], Math.max(dotRange[0], d))
        setFillDot(fitted)
      }
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [fill, dot, img, dotRange, fillFit])

  const effDot = fill ? fillDot : dot
  const dispW = img ? img.w * effDot : 0
  const dispH = img ? img.h * effDot : 0
  const bgW = img ? img.w * effDot : 0
  const bgH = img ? img.h * effDot : 0
  const bgPos =
    fillAlign === 'left' ? 'left top' : fillAlign === 'right' ? 'right top' : 'center top'

  return (
    <span
      ref={spanRef}
      className={cn('pixel-text inline-block align-middle leading-none', fill && 'block', className)}
      style={
        img && img.url
          ? {
              width: fill ? '100%' : `${dispW}px`,
              height: `${dispH}px`,
              backgroundImage: `url(${img.url})`,
              backgroundSize: `${bgW}px ${bgH}px`,
              backgroundPosition: bgPos,
              backgroundRepeat: 'no-repeat',
              imageRendering: 'pixelated',
            }
          : { width: 0, height: cellSize * effDot }
      }
      role={presentational ? undefined : 'img'}
      aria-label={presentational ? undefined : (ariaLabel ?? text)}
      aria-hidden={presentational || undefined}
    />
  )
}
