/** 平台模型档位：轻量 / 性能 / 极致，对应倍率区间 */

export type ModelTierId = 'light' | 'balanced' | 'extreme'

export interface ModelTier {
  id: ModelTierId
  /** i18n key under dashboard:model.tier* */
  labelKey: string
  rangeLabelKey: string
  min: number
  max: number
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: 'light',
    labelKey: 'tierLight',
    rangeLabelKey: 'tierLightRange',
    min: 1,
    max: 1.5,
  },
  {
    id: 'balanced',
    labelKey: 'tierBalanced',
    rangeLabelKey: 'tierBalancedRange',
    min: 1.5,
    max: 2.5,
  },
  {
    id: 'extreme',
    labelKey: 'tierExtreme',
    rangeLabelKey: 'tierExtremeRange',
    min: 2.5,
    max: 3,
  },
]

export const MODEL_OVERRIDE_AUTO = 'auto'
export const MODEL_OVERRIDE_TIER_PREFIX = 'tier:'

export function tierOverrideValue(tierId: ModelTierId): string {
  return `${MODEL_OVERRIDE_TIER_PREFIX}${tierId}`
}

export function parseTierOverride(value: string | null | undefined): ModelTierId | null {
  if (!value?.startsWith(MODEL_OVERRIDE_TIER_PREFIX)) return null
  const id = value.slice(MODEL_OVERRIDE_TIER_PREFIX.length) as ModelTierId
  return MODEL_TIERS.some((t) => t.id === id) ? id : null
}

export function tierLabelKey(tierId: ModelTierId): string {
  return findModelTier(tierId)?.labelKey ?? 'tierLight'
}

export function findModelTier(id: string): ModelTier | undefined {
  return MODEL_TIERS.find((t) => t.id === id)
}

export function tierForMultiplier(multiplier: number): ModelTier {
  const id = multiplierToTier(multiplier)
  return findModelTier(id) ?? MODEL_TIERS[0]
}

/** 由倍率反推档位（编辑回填 / 展示分类） */
export function multiplierToTier(multiplier: number): ModelTierId {
  if (multiplier <= 1.5) return 'light'
  if (multiplier <= 2.5) return 'balanced'
  return 'extreme'
}

export function isValidTierMultiplier(value: number): boolean {
  if (!Number.isFinite(value)) return false
  return MODEL_TIERS.some((t) => value >= t.min && value <= t.max)
}

export function clampTierMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1.25
  if (value < 1) return 1
  if (value > 3) return 3
  return Math.round(value * 1000) / 1000
}
