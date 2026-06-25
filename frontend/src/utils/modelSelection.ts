import type { AiModel, AvailableModels, UserModel } from '@/types/model'
import {
  MODEL_OVERRIDE_AUTO,
  MODEL_TIERS,
  multiplierToTier,
  parseTierOverride,
  tierForMultiplier,
  tierOverrideValue,
  type ModelTierId,
} from '@/config/modelTiers'

export type ModelOptionKind = 'default' | 'tier' | 'auto'

export interface ModelOption {
  value: string
  kind: ModelOptionKind
  label: string
  subtitle: string
  provider: string
  tierId?: ModelTierId
}

export interface ModelOptionLabels {
  autoLabel: string
  autoSubtitle: string
  defaultLabel: string
  defaultSubtitle: string
  tierSubtitle: string
  tierLabels: Record<ModelTierId, string>
  tierRanges: Record<ModelTierId, string>
}

export function availableTierIds(data: AvailableModels | null): ModelTierId[] {
  const tiers = new Set<ModelTierId>()
  for (const m of data?.publicModels ?? []) {
    tiers.add(multiplierToTier(m.priceMultiplier ?? 1))
  }
  return MODEL_TIERS.filter((t) => tiers.has(t.id)).map((t) => t.id)
}

/** 用户端模型选择：Auto + 档位（不暴露具体模型名） */
export function buildTierModelOptions(
  data: AvailableModels | null,
  labels: ModelOptionLabels,
  options?: { includeAccountDefault?: boolean },
): ModelOption[] {
  const includeAccountDefault = options?.includeAccountDefault ?? true
  const result: ModelOption[] = [
    {
      value: MODEL_OVERRIDE_AUTO,
      kind: 'auto',
      label: labels.autoLabel,
      subtitle: labels.autoSubtitle,
      provider: 'platform',
    },
  ]

  if (includeAccountDefault) {
    result.push({
      value: '',
      kind: 'default',
      label: labels.defaultLabel,
      subtitle: labels.defaultSubtitle,
      provider: 'platform',
    })
  }

  for (const tierId of availableTierIds(data)) {
    result.push({
      value: tierOverrideValue(tierId),
      kind: 'tier',
      label: labels.tierLabels[tierId],
      subtitle: `${labels.tierRanges[tierId]} · ${labels.tierSubtitle}`,
      provider: 'platform',
      tierId,
    })
  }

  return result
}

export function findTierModelOption(
  value: string | null | undefined,
  data: AvailableModels | null,
  labels: ModelOptionLabels,
  options?: { includeAccountDefault?: boolean },
): ModelOption {
  const normalized = value ?? ''
  const hit = buildTierModelOptions(data, labels, options).find((o) => o.value === normalized)
  if (hit) return hit

  const tierId = parseTierOverride(normalized)
  if (tierId) {
    return {
      value: normalized,
      kind: 'tier',
      label: labels.tierLabels[tierId],
      subtitle: labels.tierRanges[tierId],
      provider: 'platform',
      tierId,
    }
  }

  if (!normalized) {
    return {
      value: '',
      kind: 'default',
      label: labels.defaultLabel,
      subtitle: labels.defaultSubtitle,
      provider: 'platform',
    }
  }

  if (normalized === MODEL_OVERRIDE_AUTO) {
    return {
      value: MODEL_OVERRIDE_AUTO,
      kind: 'auto',
      label: labels.autoLabel,
      subtitle: labels.autoSubtitle,
      provider: 'platform',
    }
  }

  return {
    value: normalized,
    kind: 'tier',
    label: normalized,
    subtitle: '',
    provider: 'platform',
  }
}

export function filterModelOptions(options: ModelOption[], query: string): ModelOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return options
  return options.filter((o) => {
    const hay = `${o.label} ${o.subtitle} ${o.tierId ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
}

export function filterAiModels<T extends { displayName: string; code: string; provider: string; modelName: string }>(
  models: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return models
  return models.filter((m) => {
    const hay = `${m.displayName} ${m.code} ${m.provider} ${m.modelName}`.toLowerCase()
    return hay.includes(q)
  })
}

export function filterByokModels(models: UserModel[], query: string): UserModel[] {
  const q = query.trim().toLowerCase()
  if (!q) return models
  return models.filter((m) => {
    const hay = `${m.label} ${m.modelName ?? ''} ${m.provider ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
}

export function resolveDefaultModelValue(model: UserModel | null): string | null {
  if (!model) return ''
  if (model.modelName === MODEL_OVERRIDE_AUTO || model.label === MODEL_OVERRIDE_AUTO) {
    return MODEL_OVERRIDE_AUTO
  }
  const tierId = parseTierOverride(model.modelName)
  if (tierId) return tierOverrideValue(tierId)
  if (model.publicModelId) {
    const multiplier = model.publicModel?.priceMultiplier ?? 1
    return tierOverrideValue(multiplierToTier(multiplier))
  }
  return ''
}

/** 从用量 metadata 解析实际计费模型展示 */
export function usageEventModelDisplay(ev: {
  model?: string | null
  metadata?: Record<string, unknown> | null
}): { displayName: string; provider: string } {
  const meta = ev.metadata ?? {}
  const displayName =
    (typeof meta.displayName === 'string' && meta.displayName.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    ev.model ||
    '—'
  const provider =
    (typeof meta.provider === 'string' && meta.provider.trim()) || 'platform'
  return { displayName, provider }
}

/** @deprecated admin-only paths may still reference tier from multiplier */
export function tierForPublicModel(m: AiModel) {
  return tierForMultiplier(m.priceMultiplier ?? 1)
}

export {
  MODEL_OVERRIDE_AUTO,
  MODEL_OVERRIDE_TIER_PREFIX,
  tierLabelKey,
  tierOverrideValue,
  parseTierOverride,
  multiplierToTier,
} from '@/config/modelTiers'
