import { Input } from '@/components/ui/input'
import { ModelProviderPresetPicker } from '@/components/model/ModelProviderPresetPicker'
import { ModelProtocolField, withAnthropicProtocol } from '@/components/model/ModelProtocolField'
import { applyModelProviderPreset, MODEL_PROTOCOL } from '@/config/modelProviderPresets'
import { ModelTierPicker } from '@/components/model/ModelTierPicker'
import { multiplierToTier, type ModelTierId } from '@/config/modelTiers'
import {
  MODEL_PIXEL_INPUT,
  MODEL_PIXEL_LABEL,
  modelPixelPlanChipClass,
} from '@/lib/modelPixelClasses'

export const MODEL_PLAN_OPTIONS = ['hobby', 'pro', 'enterprise'] as const

export interface ModelFormState {
  presetId: string
  code: string
  displayName: string
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  apiKey: string
  modelTier: ModelTierId
  planCodes: string[]
}

interface ModelFormFieldsProps {
  form: ModelFormState
  onChange: (next: ModelFormState) => void
  labels: {
    preset: string
    code: string
    displayName: string
    provider: string
    protocol: string
    modelName: string
    baseUrl: string
    apiKey: string
    apiKeyOptional?: string
    tier: string
    plans: string
    readonlyHint: string
  }
  showPlans?: boolean
}

const pixelInput = `${MODEL_PIXEL_INPUT} rounded-none`
const readonlyFieldClass =
  'border-2 border-foreground/20 bg-muted/30 px-2 py-1.5 font-mono text-xs text-foreground'

export function ModelFormFields({
  form,
  onChange,
  labels,
  showPlans = true,
}: ModelFormFieldsProps) {
  const set = (patch: Partial<ModelFormState>) => onChange({ ...form, ...patch })

  return (
    <div className="grid gap-3 py-2">
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.preset}</label>
        <ModelProviderPresetPicker
          value={form.presetId}
          onChange={(preset) => {
            const applied = applyModelProviderPreset(preset, {
              label: form.displayName,
              code: form.code,
            })
            set({
              presetId: preset.id,
              provider: applied.provider,
              protocol: applied.protocol,
              modelName: applied.modelName,
              baseUrl: applied.baseUrl,
              displayName: applied.displayName ?? form.displayName,
              code: applied.code ?? form.code,
            })
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.code}</label>
        <div className={readonlyFieldClass}>{form.code || labels.readonlyHint}</div>
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.displayName}</label>
        <div className={readonlyFieldClass}>{form.displayName || labels.readonlyHint}</div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className={MODEL_PIXEL_LABEL}>{labels.provider}</label>
          <div className={readonlyFieldClass}>{form.provider || '—'}</div>
        </div>
        <ModelProtocolField label={labels.protocol} />
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.modelName}</label>
        <div className={readonlyFieldClass}>{form.modelName || labels.readonlyHint}</div>
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.baseUrl}</label>
        <div className={readonlyFieldClass}>{form.baseUrl || '—'}</div>
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.apiKey}</label>
        <Input
          type="password"
          value={form.apiKey}
          placeholder={labels.apiKeyOptional}
          onChange={(e) => set({ apiKey: e.target.value })}
          className={pixelInput}
        />
      </div>
      <ModelTierPicker value={form.modelTier} onChange={(modelTier) => set({ modelTier })} />
      {showPlans ? (
        <div className="grid gap-1.5">
          <label className={MODEL_PIXEL_LABEL}>{labels.plans}</label>
          <div className="flex flex-wrap gap-2">
            {MODEL_PLAN_OPTIONS.map((plan) => {
              const checked = form.planCodes.includes(plan)
              return (
                <button
                  key={plan}
                  type="button"
                  onClick={() => {
                    set({
                      planCodes: checked
                        ? form.planCodes.filter((p) => p !== plan)
                        : [...form.planCodes, plan],
                    })
                  }}
                  className={modelPixelPlanChipClass(checked)}
                >
                  {plan}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function emptyModelForm(): ModelFormState {
  return {
    presetId: 'claude-official',
    code: '',
    displayName: '',
    provider: 'claude',
    protocol: MODEL_PROTOCOL,
    modelName: '',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    modelTier: 'light',
    planCodes: ['hobby', 'pro', 'enterprise'],
  }
}

export function modelToForm(model: {
  code: string
  displayName: string
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  priceMultiplier: number
  planCodes?: string[]
}): ModelFormState {
  return withAnthropicProtocol({
    presetId: 'custom',
    code: model.code,
    displayName: model.displayName,
    provider: model.provider,
    protocol: model.protocol,
    modelName: model.modelName,
    baseUrl: model.baseUrl,
    apiKey: '',
    modelTier: multiplierToTier(model.priceMultiplier ?? 1),
    planCodes: model.planCodes?.length ? [...model.planCodes] : [],
  })
}
