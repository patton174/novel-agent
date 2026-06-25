import { Input } from '@/components/ui/input'
import { ModelProviderPresetPicker } from '@/components/model/ModelProviderPresetPicker'
import { ModelProtocolField, withAnthropicProtocol } from '@/components/model/ModelProtocolField'
import { ModelMultiplierField } from '@/components/model/ModelMultiplierField'
import {
  applyModelProviderPreset,
  findModelProviderPreset,
  MODEL_PROTOCOL,
  type ModelProviderPreset,
} from '@/config/modelProviderPresets'
import { isValidTierMultiplier } from '@/config/modelTiers'
import type { ModelCredential } from '@/types/model'
import {
  MODEL_PIXEL_INPUT,
  MODEL_PIXEL_LABEL,
  modelPixelPlanChipClass,
} from '@/lib/modelPixelClasses'
import { MODEL_PLAN_OPTIONS } from '@/components/model/ModelFormFields'
import { cn } from '@/lib/utils'

export type AdminCredentialMode = 'new' | 'existing'

export interface AdminModelFormState {
  credentialMode: AdminCredentialMode
  credentialId: string
  credentialLabel: string
  presetId: string
  code: string
  displayName: string
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  apiKey: string
  priceMultiplier: string
  planCodes: string[]
}

interface ModelAdminCreateFormFieldsProps {
  form: AdminModelFormState
  onChange: (next: AdminModelFormState) => void
  credentials: ModelCredential[]
  editing?: boolean
  editingCredentialId?: string | null
  labels: {
    connectionMode: string
    connectionNew: string
    connectionExisting: string
    connectionSelect: string
    connectionReadonly: string
    connectionExistingEmpty: string
    credentialLabel: string
    preset: string
    code: string
    displayName: string
    provider: string
    protocol: string
    modelName: string
    baseUrl: string
    apiKey: string
    apiKeyOptional?: string
    plans: string
  }
}

const pixelInput = `${MODEL_PIXEL_INPUT} rounded-none`

const modeBtnClass = (active: boolean) =>
  cn(
    'border-2 border-foreground px-2 py-1 font-mono text-[11px] uppercase shadow-[1px_1px_0_0_var(--foreground)]',
    active ? 'bg-foreground text-background' : 'bg-background text-foreground hover:bg-muted/40',
  )

function applyPreset(
  form: AdminModelFormState,
  preset: ModelProviderPreset,
): Partial<AdminModelFormState> {
  const applied = applyModelProviderPreset(preset, {
    label: form.displayName,
    code: form.code,
  })
  return {
    presetId: preset.id,
    provider: applied.provider,
    protocol: applied.protocol,
    modelName: applied.modelName,
    baseUrl: applied.baseUrl,
    displayName: applied.displayName ?? preset.suggestedLabel,
    code: applied.code ?? preset.suggestedCode ?? form.code,
  }
}

export function ModelAdminCreateFormFields({
  form,
  onChange,
  credentials,
  editing,
  editingCredentialId,
  labels,
}: ModelAdminCreateFormFieldsProps) {
  const set = (patch: Partial<AdminModelFormState>) => onChange({ ...form, ...patch })
  const linkedCredential = credentials.find((c) => c.id === (editingCredentialId || form.credentialId))
  const useExisting = form.credentialMode === 'existing' || Boolean(editing && editingCredentialId)
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
              placeholder={form.displayName || form.provider}
              className={pixelInput}
            />
          </div>
          <div className="grid gap-1.5">
            <label className={MODEL_PIXEL_LABEL}>{labels.provider}</label>
            <Input
              value={form.provider}
              onChange={(e) => set({ provider: e.target.value })}
              className={pixelInput}
            />
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
              onChange={(e) => set({ apiKey: e.target.value })}
              className={pixelInput}
            />
          </div>
        </>
      ) : null}

      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.preset}</label>
        <ModelProviderPresetPicker
          value={form.presetId}
          onChange={(preset) => set(applyPreset(form, preset))}
        />
      </div>
      <ModelProtocolField label={labels.protocol} />

      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.code}</label>
        <Input value={form.code} onChange={(e) => set({ code: e.target.value })} className={pixelInput} />
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.displayName}</label>
        <Input
          value={form.displayName}
          onChange={(e) => set({ displayName: e.target.value })}
          className={pixelInput}
        />
      </div>
      <div className="grid gap-1.5">
        <label className={MODEL_PIXEL_LABEL}>{labels.modelName}</label>
        <Input
          value={form.modelName}
          onChange={(e) => set({ modelName: e.target.value })}
          className={pixelInput}
        />
      </div>

      <ModelMultiplierField
        value={form.priceMultiplier}
        onChange={(priceMultiplier) => set({ priceMultiplier })}
      />

      <div className="grid gap-1.5">
        <span className={MODEL_PIXEL_LABEL}>{labels.plans}</span>
        <div className="flex flex-wrap gap-2">
          {MODEL_PLAN_OPTIONS.map((plan) => {
            const selected = form.planCodes.includes(plan)
            return (
              <button
                key={plan}
                type="button"
                className={modelPixelPlanChipClass(selected)}
                onClick={() =>
                  set({
                    planCodes: selected
                      ? form.planCodes.filter((p) => p !== plan)
                      : [...form.planCodes, plan],
                  })
                }
              >
                {plan}
              </button>
            )
          })}
        </div>
      </div>

      {editing && !editingCredentialId ? (
        <div className="grid gap-1.5">
          <label className={MODEL_PIXEL_LABEL}>
            {labels.apiKey}
            {labels.apiKeyOptional ? ` (${labels.apiKeyOptional})` : ''}
          </label>
          <Input
            type="password"
            value={form.apiKey}
            onChange={(e) => set({ apiKey: e.target.value })}
            className={pixelInput}
          />
        </div>
      ) : null}
    </div>
  )
}

export function emptyAdminModelForm(credentialId = ''): AdminModelFormState {
  const preset = findModelProviderPreset('claude-official')
  const base = withAnthropicProtocol({
    credentialMode: (credentialId ? 'existing' : 'new') as AdminCredentialMode,
    credentialId,
    credentialLabel: '',
    presetId: 'claude-official',
    code: '',
    displayName: '',
    provider: 'claude',
    protocol: MODEL_PROTOCOL,
    modelName: '',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    priceMultiplier: '1.25',
    planCodes: [],
  })
  if (!preset) return base
  return { ...base, ...applyPreset(base, preset) }
}

export function aiModelToAdminForm(model: {
  code: string
  displayName: string
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  priceMultiplier: number
  planCodes?: string[]
  credentialId?: string | null
}): AdminModelFormState {
  return withAnthropicProtocol({
    credentialMode: model.credentialId ? 'existing' : 'new',
    credentialId: model.credentialId ?? '',
    credentialLabel: '',
    presetId: 'claude-official',
    code: model.code,
    displayName: model.displayName,
    provider: model.provider,
    protocol: model.protocol,
    modelName: model.modelName,
    baseUrl: model.baseUrl,
    apiKey: '',
    priceMultiplier: String(model.priceMultiplier ?? 1.25),
    planCodes: model.planCodes?.length ? [...model.planCodes] : [],
  })
}

export function adminFormPriceMultiplier(form: AdminModelFormState): number {
  const value = Number(form.priceMultiplier)
  return Number.isFinite(value) ? value : 1.25
}

export function adminFormMultiplierValid(form: AdminModelFormState): boolean {
  return isValidTierMultiplier(Number(form.priceMultiplier))
}
