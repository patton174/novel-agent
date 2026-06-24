/** 平台模型档位：轻量 / 性能 / 极致，对应倍率区间 */

export type ModelTierId = 'light' | 'balanced' | 'extreme'

export interface ModelTier {
  id: ModelTierId
  /** i18n key under dashboard:model.tier* */
  labelKey: string
  rangeLabelKey: string
  min: number
  max: number
  defaultMultiplier: number
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: 'light',
    labelKey: 'tierLight',
    rangeLabelKey: 'tierLightRange',
    min: 1,
    max: 1.5,
    defaultMultiplier: 1.25,
  },
  {
    id: 'balanced',
    labelKey: 'tierBalanced',
    rangeLabelKey: 'tierBalancedRange',
    min: 1.5,
    max: 2.5,
    defaultMultiplier: 2,
  },
  {
    id: 'extreme',
    labelKey: 'tierExtreme',
    rangeLabelKey: 'tierExtremeRange',
    min: 2.5,
    max: 3,
    defaultMultiplier: 2.75,
  },
]

export function findModelTier(id: string): ModelTier | undefined {
  return MODEL_TIERS.find((t) => t.id === id)
}

export function modelTierMultiplier(tierId: ModelTierId): number {
  return findModelTier(tierId)?.defaultMultiplier ?? 1.25
}

/** 由已有倍率反推档位（编辑回填） */
export function multiplierToTier(multiplier: number): ModelTierId {
  if (multiplier <= 1.5) return 'light'
  if (multiplier <= 2.5) return 'balanced'
  return 'extreme'
}

export function isValidTierMultiplier(value: number): boolean {
  if (!Number.isFinite(value)) return false
  return MODEL_TIERS.some((t) => value >= t.min && value <= t.max)
}
