import { PixelText, type PixelTextSize } from './PixelText'
import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

export type NovelAiPixelWordmarkSize = 'sm' | 'md' | 'nav' | 'lg' | 'hero'

/**
 * SIZE_MAP 说明：
 * - pixel = PixelText size preset（决定 cell 网格分辨率）
 * - dot = 单源像素在屏幕上的放大倍数
 * - cursor = 末尾光标方块屏幕像素
 * - wordGapPx = 「Novel」与「Agent」之间的视觉词间距（屏幕像素）。
 *   故意设为 ≥ 1 个字符宽（pixel.cell * dot），与字间 glyphGap=1 拉开
 *   明显差距，让单词之间读起来是「两个词」而不是「NovelAgent」。
 */
const SIZE_MAP: Record<
  NovelAiPixelWordmarkSize,
  { pixel: PixelTextSize; dot: number; cursor: number; wordGapPx: number }
> = {
  sm: { pixel: 'sm', dot: 1, cursor: 4, wordGapPx: 12 },
  md: { pixel: 'md', dot: 1, cursor: 6, wordGapPx: 16 },
  // 顶部导航：比 md 放大 ~0.6 倍（dot 1.6），词间距同步放大到 1 个字符宽
  nav: { pixel: 'md', dot: 1.6, cursor: 9, wordGapPx: 26 },
  // lg 缩小 dot 到 1.4 防止 AuthShell 左侧 42-44% 栏（≈450-560px 可用）被撑爆
  lg: { pixel: 'lg', dot: 1.4, cursor: 7, wordGapPx: 32 },
  hero: { pixel: 'xl', dot: 1.8, cursor: 11, wordGapPx: 54 },
}

export interface NovelAiPixelWordmarkProps {
  size?: NovelAiPixelWordmarkSize
  /** 「Agent」点睛色，默认朋克红 #FF4500 */
  accent?: string
  /** 末尾像素光标方块（呼应 LIVE/光标感），默认开 */
  cursor?: boolean
  className?: string
  label?: string
}

/**
 * NovelAiPixelWordmark —— 品牌 slogan 的像素点阵版。
 * 「Novel」用 currentColor（随主题）+「Agent」用朋克点睛色，
 * 末尾跟一个像素方块光标，强化像素朋克的「正在运行」感。
 * 细点（1px）+ 按位放大，可在导航/页脚等高频位大量复用而不卡。
 *
 * 词间距：两个 PixelText 之间用 1 个字符宽（pixel.cell * dot）的间距
 * 由内联 width 撑开，比字间 glyphGap 明显大，读起来像「两个词」。
 */
export function NovelAiPixelWordmark({
  size = 'md',
  accent = '#ff4500',
  cursor = true,
  className,
  label = BRAND_NAME,
}: NovelAiPixelWordmarkProps) {
  const s = SIZE_MAP[size]
  return (
    <span
      className={cn('inline-flex items-end', className)}
      role="img"
      aria-label={label}
    >
      <PixelText text="Novel" size={s.pixel} dot={s.dot} fontWeight={900} presentational />
      {/* 词间距：用 1 个字符宽的 inline-block 占位，明确读出"Novel Agent"是两个词 */}
      <span aria-hidden style={{ display: 'inline-block', width: s.wordGapPx }} />
      <PixelText text="Agent" size={s.pixel} dot={s.dot} color={accent} fontWeight={900} presentational />
      {cursor ? (
        <span
          aria-hidden
          className="pixel-cursor-blink ml-1 inline-block shrink-0 bg-punk-red"
          style={{ width: s.cursor, height: s.cursor, marginBottom: 1 }}
        />
      ) : null}
    </span>
  )
}
