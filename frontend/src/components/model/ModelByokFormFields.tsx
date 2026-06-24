import { Input } from '@/components/ui/input'
import { ModelProviderPresetPicker } from '@/components/model/ModelProviderPresetPicker'
import { ModelProtocolField } from '@/components/model/ModelProtocolField'
import { applyModelProviderPreset, MODEL_PROTOCOL } from '@/config/modelProviderPresets'
import type { ModelCredential } from '@/types/model'
import { MODEL_PIXEL_LABEL } from '@/lib/modelPixelClasses'
import { cn } from '@/lib/utils'

export type ByokCredentialMode = 'new' | 'existing'

export interface ByokFormState {
  credentialMode: ByokCredentialMode
  credentialId: string
  credentialLabel: string
  presetId: string
  label: string
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  apiKey: string
}

interface ModelByokFormFieldsProps {
  form: ByokFormState
  onChange: (next: ByokFormState) => void
  credentials: ModelCredential[]
  editing?: boolean
  labels: {
    connectionMode: string
    connectionNew: string
    connectionExisting: string
    connectionSelect: string
    connectionReadonly: string
    connectionExistingEmpty: string
    credentialLabel: string
    preset: string
    label: string
    provider: string
    protocol: string
    modelName: string
    baseUrl: string
    apiKey: string
    apiKeyOptional?: string
    readonlyHint: string
  }
}

const pixelInput =
  'rounded-none border-2 border-foreground font-mono shadow-[1px_1px_0_0_var(--foreground)]'
const readonlyFieldClass =
  'border-2 border-foreground/20 bg-muted/30 px-2 py-1.5 font-mono text-xs text-foreground'

const modeBtnClass = (active: boolean) =>
  cn(
    'border-2 border-foreground px-2 py-1 font-mono text-[11px] uppercase shadow-[1px_1px_0_0_var(--foreground)]',
    active ? 'bg-foreground text-background' : 'bg-background text-foreground hover:bg-muted/40',
  )

export function ModelByokFormFields({
  form,
  onChange,
  credentials,
  editing,
  labels,
}: ModelByokFormFieldsProps) {
  const set = (patch: Partial<ByokFormState>) => onChange({ ...form, ...patch })
  const linkedCredential = credentials.find((c) => c.id === form.credentialId)
  const useExisting = form.credentialMode === 'existing' || Boolean(editing && form.credentialId)
  const showConnectionFields = !editing && !useExisting
  const showCredentialPicker = !editing && useExisting

  return (
    <div className="grid gap-3 py-2">
      {!editing && (
        <div className="grid gap-1.5">
          <span className={MODEL_PIXEL_LABEL}>{labels.connectionMode}</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={modeBtnClass(form.credentialMode === 'new')}
              onClick={() => set({ credentialMode: 'new', credentialId: '' })}
            >
              {labels.connectionNew}
            </button>
            <button
              type="button"
              className={modeBtnClass(form.credentialMode === 'existing')}
              disabled={credentials.length === 0}
              onClick={() => set({ credentialMode: 'existing' })}
            >
              {labels.connectionExisting}
            </button>
          </div>
          {credentials.length === 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground">{labels.connectionExistingEmpty}</p>
          ) : null}
        </div>
      )}

      {showCredentialPicker ? (
        <div className="grid gap-1.5">
          <label className={MODEL_PIXEL_LABEL}>{labels.connectionSelect}</label>
          <select
            value={form.credentialId}
            onChange={(e) => {
              const cred = credentials.find((c) => c.id === e.target.value)
              set({
                credentialId: e.target.value,
                provider: cred?.provider ?? form.provider,
                baseUrl: cred?.baseUrl ?? form.baseUrl,
                protocol: MODEL_PROTOCOL,
              })
            }}
            className={cn(pixelInput, 'h-9 bg-background px-2 text-xs')}
          >
            <option value="">{labels.connectionSelect}</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.provider})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {editing && linkedCredential ? (
        <div className="border-2 border-foreground/20 bg-muted/20 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
          {labels.connectionReadonly}: {linkedCredential.label} · {linkedCredential.apiKeyMasked}
        </div>
      ) : null}

      {showConnectionFields ? (
        <>
          <div className="grid gap-1.5">
            <label className={MODEL_PIXEL_LABEL}>{labels.credentialLabel}</label>
            <Input
              value={form.credentialLabel}
              onChange={(e) => set({ credentialLabel: e.target.value })}
              placeholder={form.label || form.provider}
              className={pixelInput}
            />
          </div>
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
                  modelName: applied.modelName || form.modelName,
                  baseUrl: applied.baseUrl,
                  label: applied.label ?? form.label,
                })
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={MODEL_PIXEL_LABEL}>{labels.provider}</label>
              <div className={readonlyFieldClass}>{form.provider || '—'}</div>
            </div>
            <ModelProtocolField label={labels.protocol} />
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
              onChange={(e) => set({ apiKey: e.target.value })}
              className={pixelInput}
            />
          </div>
        </>
      ) : null}

      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.label}</label>
        <div className={readonlyFieldClass}>{form.label || labels.readonlyHint}</div>
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.modelName}</label>
        <div className={readonlyFieldClass}>{form.modelName || labels.readonlyHint}</div>
      </div>

      {!showConnectionFields && !editing ? (
        <div className="grid gap-1.5">
          <label className={MODEL_PIXEL_LABEL}>{labels.preset}</label>
          <ModelProviderPresetPicker
            value={form.presetId}
            onChange={(preset) => {
              const applied = applyModelProviderPreset(preset)
              set({
                presetId: preset.id,
                modelName: applied.modelName,
              })
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

export function emptyByokForm(credentialId = ''): ByokFormState {
  return {
    credentialMode: credentialId ? 'existing' : 'new',
    credentialId,
    credentialLabel: '',
    presetId: 'claude-official',
    label: '',
    provider: 'claude',
    protocol: MODEL_PROTOCOL,
    modelName: '',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
  }
}

export function userModelToByokForm(model: {
  label?: string | null
  provider?: string | null
  protocol?: string | null
  modelName?: string | null
  baseUrl?: string | null
  credentialId?: string | null
}): ByokFormState {
  return {
    credentialMode: model.credentialId ? 'existing' : 'new',
    credentialId: model.credentialId ?? '',
    credentialLabel: '',
    presetId: 'custom',
    label: model.label ?? '',
    provider: model.provider ?? 'custom',
    protocol: MODEL_PROTOCOL,
    modelName: model.modelName ?? '',
    baseUrl: model.baseUrl ?? '',
    apiKey: '',
  }
}
