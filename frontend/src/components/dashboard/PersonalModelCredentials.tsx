import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createByok,
  createCredential,
  deleteByok,
  deleteCredential,
  fetchDefaultModel,
  setDefaultModel,
  updateByok,
  updateCredential,
} from '@/api/modelApi'
import {
  ModelByokFormFields,
  emptyByokForm,
  userModelToByokForm,
} from '@/components/model/ModelByokFormFields'
import { ModelByokCard } from '@/components/model/ModelByokCard'
import {
  ModelCredentialFormFields,
  credentialToForm,
  emptyCredentialForm,
} from '@/components/model/ModelCredentialFormFields'
import { ModelCredentialCard } from '@/components/model/ModelCredentialCard'
import { useAvailableModels } from '@/hooks/useAvailableModels'
import { MODEL_PROTOCOL } from '@/config/modelProviderPresets'
import { filterByokModels } from '@/utils/modelSelection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import type { ModelCredential, UserModel } from '@/types/model'
import { MODEL_PIXEL_INPUT, modelPixelActionBtnClass } from '@/lib/modelPixelClasses'
import { cn } from '@/lib/utils'

/** API 连接与 BYOK 私有模型管理（设置页独立区块）。 */
export function PersonalModelCredentials() {
  const { t } = useTranslation(['dashboard'])
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)
  const [byokOpen, setByokOpen] = useState(false)
  const [credentialOpen, setCredentialOpen] = useState(false)
  const [editingByok, setEditingByok] = useState<UserModel | null>(null)
  const [editingCredential, setEditingCredential] = useState<ModelCredential | null>(null)
  const [byokForm, setByokForm] = useState(emptyByokForm)
  const [credentialForm, setCredentialForm] = useState(emptyCredentialForm)
  const [byokSaving, setByokSaving] = useState(false)
  const [credentialSaving, setCredentialSaving] = useState(false)
  const [byokSearch, setByokSearch] = useState('')
  const { data: available, loading: byokLoading, reload: reloadModels } = useAvailableModels('llm')
  const byok = available?.byok ?? []
  const credentials = available?.credentials ?? []
  const filteredByok = useMemo(() => filterByokModels(byok, byokSearch), [byok, byokSearch])
  const byokByCredential = useMemo(() => {
    const map = new Map<string, UserModel[]>()
    for (const m of filteredByok) {
      const key = m.credentialId || '__legacy__'
      const list = map.get(key) ?? []
      list.push(m as UserModel)
      map.set(key, list)
    }
    return map
  }, [filteredByok])
  const legacyByok = byokByCredential.get('__legacy__') ?? []
  const isEmpty = !byokLoading && credentials.length === 0 && byok.length === 0

  const byokFormLabels = {
    connectionMode: t('dashboard:model.byokFormConnectionMode'),
    connectionNew: t('dashboard:model.byokFormConnectionNew'),
    connectionExisting: t('dashboard:model.byokFormConnectionExisting'),
    connectionSelect: t('dashboard:model.byokFormConnectionSelect'),
    connectionReadonly: t('dashboard:model.byokFormConnectionReadonly'),
    connectionExistingEmpty: t('dashboard:model.byokFormConnectionExistingEmpty'),
    credentialLabel: t('dashboard:model.byokFormCredentialLabel'),
    preset: t('dashboard:model.byokFormPreset'),
    label: t('dashboard:model.byokFormLabel'),
    provider: t('dashboard:model.byokFormProvider'),
    protocol: t('dashboard:model.byokFormProtocol'),
    modelName: t('dashboard:model.byokFormModelName'),
    baseUrl: t('dashboard:model.byokFormBaseUrl'),
    apiKey: t('dashboard:model.byokFormApiKey'),
    apiKeyOptional: t('dashboard:model.byokFormApiKeyOptional'),
    readonlyHint: t('dashboard:model.formPresetFirst'),
  }

  const credentialFormLabels = {
    preset: t('dashboard:model.byokFormPreset'),
    label: t('dashboard:model.credentialFormLabel'),
    provider: t('dashboard:model.byokFormProvider'),
    protocol: t('dashboard:model.byokFormProtocol'),
    baseUrl: t('dashboard:model.byokFormBaseUrl'),
    apiKey: t('dashboard:model.byokFormApiKey'),
    apiKeyOptional: t('dashboard:model.byokFormApiKeyOptional'),
  }

  useEffect(() => {
    if (window.location.hash !== '#api-models') return
    document.getElementById('api-models')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDefaultModel('llm')
      .then((model) => {
        if (cancelled) return
        if (!model) {
          setDefaultModelId(null)
          return
        }
        setDefaultModelId(model.publicModelId ? `pub:${model.publicModelId}` : model.id)
      })
      .catch(() => {
        if (!cancelled) setDefaultModelId(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDefaultModelChange = useCallback(async (value: string) => {
    try {
      await setDefaultModel('llm', value)
      setDefaultModelId(value)
      appToast.success(t('dashboard:model.defaultSaved'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('dashboard:model.defaultSaveFailed'))
    }
  }, [t])

  const handleDeleteByok = useCallback(async (model: UserModel) => {
    const name = model.label || model.modelName || model.id
    const ok = await confirmAction({
      title: t('dashboard:model.byokDeleteTitle'),
      description: t('dashboard:model.byokDeleteDesc', { name }),
      confirmLabel: t('dashboard:model.byokDeleteBtn'),
      danger: true,
    })
    if (!ok) return
    try {
      await deleteByok(model.id)
      await reloadModels()
      if (defaultModelId === model.id) setDefaultModelId(null)
      appToast.success(t('dashboard:model.byokDeleted'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('dashboard:model.byokDeleteFail'))
    }
  }, [defaultModelId, reloadModels, t])

  const handleDeleteCredential = useCallback(async (cred: ModelCredential) => {
    const ok = await confirmAction({
      title: t('dashboard:model.credentialDeleteTitle'),
      description: t('dashboard:model.credentialDeleteDesc', { name: cred.label }),
      confirmLabel: t('dashboard:model.credentialDeleteBtn'),
      danger: true,
    })
    if (!ok) return
    try {
      await deleteCredential(cred.id)
      await reloadModels()
      appToast.success(t('dashboard:model.credentialDeleted'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('dashboard:model.credentialDeleteFail'))
    }
  }, [reloadModels, t])

  const openCreateByok = (credentialId = '') => {
    setEditingByok(null)
    setByokForm(emptyByokForm(credentialId))
    setByokOpen(true)
  }

  const openEditByok = (model: UserModel) => {
    setEditingByok(model)
    setByokForm(userModelToByokForm(model))
    setByokOpen(true)
  }

  const openCreateCredential = () => {
    setEditingCredential(null)
    setCredentialForm(emptyCredentialForm())
    setCredentialOpen(true)
  }

  const openEditCredential = (cred: ModelCredential) => {
    setEditingCredential(cred)
    setCredentialForm(credentialToForm(cred))
    setCredentialOpen(true)
  }

  const handleSaveByok = useCallback(async () => {
    if (!byokForm.modelName.trim() || !byokForm.label.trim()) {
      appToast.error(t('dashboard:model.byokCreateRequired'))
      return
    }
    const useExisting = byokForm.credentialMode === 'existing' || Boolean(editingByok?.credentialId)
    if (!editingByok) {
      if (useExisting && !byokForm.credentialId) {
        appToast.error(t('dashboard:model.byokFormConnectionSelect'))
        return
      }
      if (!useExisting && !byokForm.apiKey.trim()) {
        appToast.error(t('dashboard:model.byokCreateRequired'))
        return
      }
    }
    setByokSaving(true)
    try {
      const payload = {
        label: byokForm.label.trim(),
        protocol: MODEL_PROTOCOL,
        modelName: byokForm.modelName.trim() || byokForm.label.trim(),
        ...(useExisting
          ? { credentialId: byokForm.credentialId }
          : {
              provider: byokForm.provider.trim(),
              baseUrl: byokForm.baseUrl.trim(),
              apiKey: byokForm.apiKey.trim(),
              credentialLabel: byokForm.credentialLabel.trim() || undefined,
            }),
      }
      if (editingByok) {
        await updateByok(editingByok.id, payload)
        appToast.success(t('dashboard:model.byokUpdated'))
      } else {
        await createByok(payload)
        appToast.success(t('dashboard:model.byokCreated'))
      }
      setByokOpen(false)
      setEditingByok(null)
      setByokForm(emptyByokForm())
      await reloadModels()
    } catch (e) {
      appToast.error(
        e instanceof Error
          ? e.message
          : editingByok
            ? t('dashboard:model.byokUpdateFail')
            : t('dashboard:model.byokCreateFail'),
      )
    } finally {
      setByokSaving(false)
    }
  }, [byokForm, editingByok, reloadModels, t])

  const handleSaveCredential = useCallback(async () => {
    if (!credentialForm.label.trim()) {
      appToast.error(t('dashboard:model.credentialCreateRequired'))
      return
    }
    if (!editingCredential && !credentialForm.apiKey.trim()) {
      appToast.error(t('dashboard:model.credentialCreateRequired'))
      return
    }
    setCredentialSaving(true)
    try {
      const payload = {
        label: credentialForm.label.trim(),
        provider: credentialForm.provider.trim(),
        protocol: MODEL_PROTOCOL,
        baseUrl: credentialForm.baseUrl.trim(),
        ...(credentialForm.apiKey.trim() ? { apiKey: credentialForm.apiKey.trim() } : {}),
      }
      if (editingCredential) {
        await updateCredential(editingCredential.id, payload)
        appToast.success(t('dashboard:model.credentialUpdated'))
      } else {
        await createCredential({ ...payload, apiKey: credentialForm.apiKey.trim() })
        appToast.success(t('dashboard:model.credentialCreated'))
      }
      setCredentialOpen(false)
      setEditingCredential(null)
      setCredentialForm(emptyCredentialForm())
      await reloadModels()
    } catch (e) {
      appToast.error(
        e instanceof Error
          ? e.message
          : editingCredential
            ? t('dashboard:model.credentialUpdateFail')
            : t('dashboard:model.credentialCreateFail'),
      )
    } finally {
      setCredentialSaving(false)
    }
  }, [credentialForm, editingCredential, reloadModels, t])

  return (
    <>
      <div id="api-models" className="scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCreateCredential} className={modelPixelActionBtnClass()}>
              {t('dashboard:model.addCredential')}
            </button>
            <button type="button" onClick={() => openCreateByok()} className={modelPixelActionBtnClass()}>
              {t('dashboard:model.addByok')}
            </button>
          </div>
        </div>

        {byok.length > 2 ? (
          <Input
            value={byokSearch}
            onChange={(e) => setByokSearch(e.target.value)}
            placeholder={t('dashboard:model.searchPlaceholder')}
            className={cn(MODEL_PIXEL_INPUT, 'mb-3 rounded-none')}
          />
        ) : null}

        {byokLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-none" />
            <Skeleton className="h-16 w-full rounded-none" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-start gap-3 border-2 border-dashed border-foreground/25 p-4">
            <p className="font-mono text-xs text-muted-foreground">{t('dashboard:model.credentialEmpty')}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openCreateCredential} className={modelPixelActionBtnClass()}>
                {t('dashboard:model.addCredential')}
              </button>
              <button type="button" onClick={() => openCreateByok()} className={modelPixelActionBtnClass()}>
                {t('dashboard:model.addByok')}
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {credentials.map((cred) => {
              const models = byokByCredential.get(cred.id) ?? []
              return (
                <li key={cred.id} className="space-y-2">
                  <ModelCredentialCard
                    credential={cred}
                    addModelLabel={t('dashboard:model.credentialAddModel')}
                    editLabel={t('dashboard:model.credentialEditBtn')}
                    deleteLabel={t('dashboard:model.credentialDeleteBtn')}
                    modelCountLabel={t('dashboard:model.credentialModelCount')}
                    onAddModel={() => openCreateByok(cred.id)}
                    onEdit={() => openEditCredential(cred)}
                    onDelete={() => void handleDeleteCredential(cred)}
                  />
                  {models.length > 0 ? (
                    <ul className="ml-3 space-y-2 border-l-2 border-foreground/20 pl-3">
                      {models.map((m) => (
                        <li key={m.id}>
                          <ModelByokCard
                            model={m}
                            isSelected={defaultModelId === m.id}
                            byokBadge={t('dashboard:model.byokBadge')}
                            useAsDefaultLabel={t('dashboard:model.useAsDefault')}
                            editLabel={t('dashboard:model.byokEditBtn')}
                            deleteLabel={t('dashboard:model.byokDeleteBtn')}
                            onUseAsDefault={() => void handleDefaultModelChange(m.id)}
                            onEdit={() => openEditByok(m)}
                            onDelete={() => void handleDeleteByok(m)}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="ml-3 flex flex-wrap items-center gap-2 border-l-2 border-dashed border-foreground/15 pl-3">
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {t('dashboard:model.credentialNoModels')}
                      </p>
                      <button
                        type="button"
                        onClick={() => openCreateByok(cred.id)}
                        className={modelPixelActionBtnClass('h-7 px-2')}
                      >
                        {t('dashboard:model.credentialAddModel')}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}

            {legacyByok.length > 0 ? (
              <li className="space-y-2">
                <p className="font-mono text-[11px] font-bold uppercase text-muted-foreground">
                  {t('dashboard:model.byokLegacyGroup')}
                </p>
                <ul className="space-y-2">
                  {legacyByok.map((m) => (
                    <li key={m.id}>
                      <ModelByokCard
                        model={m}
                        isSelected={defaultModelId === m.id}
                        byokBadge={t('dashboard:model.byokBadge')}
                        useAsDefaultLabel={t('dashboard:model.useAsDefault')}
                        editLabel={t('dashboard:model.byokEditBtn')}
                        deleteLabel={t('dashboard:model.byokDeleteBtn')}
                        onUseAsDefault={() => void handleDefaultModelChange(m.id)}
                        onEdit={() => openEditByok(m)}
                        onDelete={() => void handleDeleteByok(m)}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <AppModalShell
        open={credentialOpen}
        onOpenChange={(open) => {
          setCredentialOpen(open)
          if (!open) {
            setEditingCredential(null)
            setCredentialForm(emptyCredentialForm())
          }
        }}
        size="form"
        title={
          editingCredential
            ? t('dashboard:model.credentialEditTitle')
            : t('dashboard:model.credentialCreateTitle')
        }
        description={
          editingCredential
            ? t('dashboard:model.credentialEditDesc')
            : t('dashboard:model.credentialCreateDesc')
        }
      >
        <ModelCredentialFormFields
          form={credentialForm}
          onChange={setCredentialForm}
          labels={credentialFormLabels}
          apiKeyOptional={Boolean(editingCredential)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setCredentialOpen(false)} disabled={credentialSaving}>
            {t('dashboard:model.byokCreateCancel')}
          </Button>
          <Button onClick={() => void handleSaveCredential()} disabled={credentialSaving}>
            {credentialSaving ? t('dashboard:model.byokCreating') : t('dashboard:model.byokFormSubmit')}
          </Button>
        </DialogFooter>
      </AppModalShell>

      <AppModalShell
        open={byokOpen}
        onOpenChange={(open) => {
          setByokOpen(open)
          if (!open) {
            setEditingByok(null)
            setByokForm(emptyByokForm())
          }
        }}
        size="form"
        title={
          editingByok ? t('dashboard:model.byokEditTitle') : t('dashboard:model.byokCreateTitle')
        }
        description={
          editingByok ? t('dashboard:model.byokEditDesc') : t('dashboard:model.byokCreateDesc')
        }
      >
        <ModelByokFormFields
          form={byokForm}
          onChange={setByokForm}
          credentials={credentials}
          editing={Boolean(editingByok)}
          labels={byokFormLabels}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setByokOpen(false)} disabled={byokSaving}>
            {t('dashboard:model.byokCreateCancel')}
          </Button>
          <Button onClick={() => void handleSaveByok()} disabled={byokSaving}>
            {byokSaving ? t('dashboard:model.byokCreating') : t('dashboard:model.byokFormSubmit')}
          </Button>
        </DialogFooter>
      </AppModalShell>
    </>
  )
}
