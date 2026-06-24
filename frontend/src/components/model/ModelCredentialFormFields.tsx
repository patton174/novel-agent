import { Input } from '@/components/ui/input'
import { ModelProviderPresetPicker } from '@/components/model/ModelProviderPresetPicker'
import { ModelProtocolField } from '@/components/model/ModelProtocolField'
import { applyModelProviderPreset, MODEL_PROTOCOL } from '@/config/modelProviderPresets'
import { MODEL_PIXEL_LABEL } from '@/lib/modelPixelClasses'

export interface CredentialFormState {
  presetId: string
  label: string
  provider: string
  protocol: string
  baseUrl: string
  apiKey: string
}

interface ModelCredentialFormFieldsProps {
  form: CredentialFormState
  onChange: (next: CredentialFormState) => void
  labels: {
    preset: string
    label: string
    provider: string
    protocol: string
    baseUrl: string
    apiKey: string
    apiKeyOptional?: string
  }
  apiKeyOptional?: boolean
}

const pixelInput =
  'rounded-none border-2 border-foreground font-mono shadow-[1px_1px_0_0_var(--foreground)]'

export function ModelCredentialFormFields({
  form,
  onChange,
  labels,
  apiKeyOptional,
}: ModelCredentialFormFieldsProps) {
  const set = (patch: Partial<CredentialFormState>) => onChange({ ...form, ...patch })

  return (
    <div className="grid gap-3 py-2">
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.preset}</label>
        <ModelProviderPresetPicker
          value={form.presetId}
          onChange={(preset) => {
            const applied = applyModelProviderPreset(preset, { label: form.label })
            set({
              presetId: preset.id,
              provider: applied.provider,
              protocol: applied.protocol,
              baseUrl: applied.baseUrl,
              label: applied.label ?? form.label,
            })
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.label}</label>
        <Input value={form.label} onChange={(e) => set({ label: e.target.value })} className={pixelInput} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className={MODEL_PIXEL_LABEL}>{labels.provider}</label>
          <Input
            value={form.provider}
            onChange={(e) => set({ provider: e.target.value })}
            className={pixelInput}
          />
        </div>
        <ModelProtocolField label={labels.protocol} />
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.baseUrl}</label>
        <Input
          value={form.baseUrl}
          onChange={(e) => set({ baseUrl: e.target.value })}
          className={pixelInput}
        />
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.apiKey}</label>
        <Input
          type="password"
          value={form.apiKey}
          placeholder={apiKeyOptional ? labels.apiKeyOptional : undefined}
          onChange={(e) => set({ apiKey: e.target.value })}
          className={pixelInput}
        />
      </div>
    </div>
  )
}

export function emptyCredentialForm(): CredentialFormState {
  return {
    presetId: 'claude-official',
    label: '',
    provider: 'claude',
    protocol: MODEL_PROTOCOL,
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
  }
}

export function credentialToForm(cred: {
  label: string
  provider?: string | null
  protocol?: string | null
  baseUrl?: string | null
}): CredentialFormState {
  return {
    presetId: 'custom',
    label: cred.label,
    provider: cred.provider ?? 'custom',
    protocol: MODEL_PROTOCOL,
    baseUrl: cred.baseUrl ?? '',
    apiKey: '',
  }
}
