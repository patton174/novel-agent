/** 模型提供商预设（对齐 cc-switch claudeProviderPresets，协议固定 anthropic） */

import presetsData from './modelProviderPresets.data.json'

/** 当前后端仅支持 Anthropic Messages API */
export const MODEL_PROTOCOL = 'anthropic' as const

export type ModelProviderCategory =
  | 'official'
  | 'cn_official'
  | 'aggregator'
  | 'third_party'
  | 'cloud_provider'
  | 'custom'

export interface ModelProviderPreset {
  id: string
  label: string
  provider: string
  protocol: typeof MODEL_PROTOCOL
  modelName: string
  baseUrl: string
  suggestedLabel: string
  suggestedCode?: string
  category?: ModelProviderCategory
}

export const MODEL_PROVIDER_PRESETS: ModelProviderPreset[] = (
  presetsData as ModelProviderPreset[]
).map((p) => ({ ...p, protocol: MODEL_PROTOCOL }))

/** 可配置预设（不含自定义） */
export const CONFIGURABLE_MODEL_PRESETS: ModelProviderPreset[] = MODEL_PROVIDER_PRESETS.filter(
  (p) => p.id !== 'custom',
)

export function findModelProviderPreset(id: string): ModelProviderPreset | undefined {
  return MODEL_PROVIDER_PRESETS.find((p) => p.id === id)
}

export function filterModelProviderPresets(
  query: string,
  presets: ModelProviderPreset[] = MODEL_PROVIDER_PRESETS,
): ModelProviderPreset[] {
  const q = query.trim().toLowerCase()
  if (!q) return presets
  return presets.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.provider.toLowerCase().includes(q) ||
      p.baseUrl.toLowerCase().includes(q) ||
      p.modelName.toLowerCase().includes(q),
  )
}

export function applyModelProviderPreset(
  preset: ModelProviderPreset,
  current?: { label?: string; code?: string },
): {
  provider: string
  protocol: typeof MODEL_PROTOCOL
  modelName: string
  baseUrl: string
  label?: string
  code?: string
  displayName?: string
} {
  const next = {
    provider: preset.provider,
    protocol: MODEL_PROTOCOL,
    modelName: preset.modelName,
    baseUrl: preset.baseUrl,
  }
  if (preset.id === 'custom') {
    return next
  }
  return {
    ...next,
    label: current?.label?.trim() ? current.label : preset.suggestedLabel,
    displayName: current?.label?.trim() ? current.label : preset.suggestedLabel,
    code: current?.code?.trim() ? current.code : preset.suggestedCode ?? '',
  }
}
