import type { PixelAvatarStyle } from './types'

/** 画布规格：同宽变体挂在同一 canvas 下，只换 overlay */
export type PixelAvatarCanvas = '140' | 'grid-7' | 'grid-8'

export interface PixelAvatarVariantMeta {
  style: PixelAvatarStyle
  canvas: PixelAvatarCanvas
  /** 同画布家族 — 共享躯体/网格定义 */
  family?: string
  /** Ghost 系列专用：面部 overlay 类型 */
  face?: 'classic' | 'hungry'
  labelKey: string
}

/**
 * 注册表 — 新增同宽变体时：
 * 1. 若与 ghost 同 140px 网格 → 只加 face overlay + registry 项，不改 PixelAvatarShell
 * 2. 若是新画布尺寸 → 新 family + 独立 CSS 块
 */
export const PIXEL_AVATAR_REGISTRY: PixelAvatarVariantMeta[] = [
  { style: 'ghost', canvas: '140', family: 'ghost', face: 'classic', labelKey: 'editor:avatar.styles.ghost' },
  { style: 'ghost-hungry', canvas: '140', family: 'ghost', face: 'hungry', labelKey: 'editor:avatar.styles.ghostHungry' },
  { style: 'bot', canvas: 'grid-8', labelKey: 'editor:avatar.styles.bot' },
  { style: 'slime', canvas: 'grid-7', labelKey: 'editor:avatar.styles.slime' },
  { style: 'star', canvas: 'grid-7', labelKey: 'editor:avatar.styles.star' },
  { style: 'heart', canvas: 'grid-7', labelKey: 'editor:avatar.styles.heart' },
  { style: 'kitty', canvas: 'grid-8', labelKey: 'editor:avatar.styles.kitty' },
]

export function getAvatarMeta(style: PixelAvatarStyle): PixelAvatarVariantMeta | undefined {
  return PIXEL_AVATAR_REGISTRY.find((v) => v.style === style)
}

export function listGhostFamily(): PixelAvatarVariantMeta[] {
  return PIXEL_AVATAR_REGISTRY.filter((v) => v.family === 'ghost')
}
