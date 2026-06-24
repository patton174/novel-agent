import type { AiModel, AvailableModels, UserModel } from '@/types/model'

export type ModelOptionKind = 'default' | 'public' | 'byok'

export interface ModelOption {
  value: string
  kind: ModelOptionKind
  label: string
  subtitle: string
  provider: string
  multiplier?: number
  isDefaultPublic?: boolean
}

export function buildModelOptions(
  data: AvailableModels | null,
  labels: {
    platformDefault: string
    defaultSubtitle: string
  },
): ModelOption[] {
  const options: ModelOption[] = [
    {
      value: '',
      kind: 'default',
      label: labels.platformDefault,
      subtitle: labels.defaultSubtitle,
      provider: 'platform',
    },
  ]

  for (const m of data?.publicModels ?? []) {
    options.push(publicToOption(m))
  }
  for (const m of data?.byok ?? []) {
    options.push(byokToOption(m))
  }
  return options
}

function publicToOption(m: AiModel): ModelOption {
  return {
    value: `pub:${m.id}`,
    kind: 'public',
    label: m.displayName,
    subtitle: `${m.provider} · ${m.modelName}`,
    provider: m.provider,
    multiplier: m.priceMultiplier !== 1 ? m.priceMultiplier : undefined,
    isDefaultPublic: m.isDefault,
  }
}

function byokToOption(m: UserModel): ModelOption {
  return {
    value: m.id,
    kind: 'byok',
    label: m.label || m.modelName || m.id,
    subtitle: `${m.provider ?? 'custom'} · ${m.modelName ?? ''}`.trim(),
    provider: m.provider ?? 'custom',
  }
}

export function findModelOption(
  value: string | null | undefined,
  data: AvailableModels | null,
  labels: { platformDefault: string; defaultSubtitle: string },
): ModelOption {
  const normalized = value ?? ''
  const hit = buildModelOptions(data, labels).find((o) => o.value === normalized)
  if (hit) return hit
  return {
    value: normalized,
    kind: normalized.startsWith('pub:') ? 'public' : normalized ? 'byok' : 'default',
    label: normalized || labels.platformDefault,
    subtitle: '',
    provider: 'custom',
  }
}

export function filterModelOptions(options: ModelOption[], query: string): ModelOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return options
  return options.filter((o) => {
    const hay = `${o.label} ${o.subtitle} ${o.provider}`.toLowerCase()
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

export function filterByokModels(
  models: {
    label?: string | null
    modelName?: string | null
    provider?: string | null
    credentialId?: string | null
    credentialLabel?: string | null
    id: string
  }[],
  query: string,
) {
  const q = query.trim().toLowerCase()
  if (!q) return models
  return models.filter((m) => {
    const hay =
      `${m.label ?? ''} ${m.modelName ?? ''} ${m.provider ?? ''} ${m.credentialLabel ?? ''} ${m.id}`.toLowerCase()
    return hay.includes(q)
  })
}
