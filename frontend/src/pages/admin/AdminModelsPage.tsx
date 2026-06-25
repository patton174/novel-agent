import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import {
  adminCreateCredential,
  adminCreateModel,
  adminDeleteCredential,
  adminDeleteModel,
  adminListCredentials,
  adminListModels,
  adminReorderModels,
  adminSetDefault,
  adminSetPlans,
  adminTestModel,
  adminUpdateCredential,
  adminUpdateModel,
} from '@/api/modelApi'
import { AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { cn } from '@/lib/utils'
import { MODEL_PROTOCOL } from '@/config/modelProviderPresets'
import type { AiModel, ModelCredential, ModelType } from '@/types/model'
import { ProIconAdminSystem } from '@/components/pro/icons/proIcons'
import { ModelAdminCard, type ModelTestResult } from '@/components/model/ModelAdminCard'
import { ModelAdminSortableList } from '@/components/model/ModelAdminSortableList'
import {
  ModelAdminCreateFormFields,
  adminFormMultiplierValid,
  adminFormPriceMultiplier,
  aiModelToAdminForm,
  emptyAdminModelForm,
  type AdminModelFormState,
} from '@/components/model/ModelAdminCreateFormFields'
import {
  ModelCredentialFormFields,
  credentialToForm,
  emptyCredentialForm,
} from '@/components/model/ModelCredentialFormFields'
import { ModelCredentialCard } from '@/components/model/ModelCredentialCard'
import { filterAiModels } from '@/utils/modelSelection'
import { modelPixelActionBtnClass } from '@/lib/modelPixelClasses'

const TYPES: ModelType[] = ['llm', 'embedding', 'crawl', 'image']

export default function AdminModelsPage() {
  useMarkRouteSeen()
  const { t } = useTranslation(['admin', 'dashboard'])
  const [type, setType] = useState<ModelType>('llm')
  const [models, setModels] = useState<AiModel[] | null>(null)
  const [credentials, setCredentials] = useState<ModelCredential[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, ModelTestResult>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<AdminModelFormState>(emptyAdminModelForm())
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AiModel | null>(null)
  const [editForm, setEditForm] = useState<AdminModelFormState>(emptyAdminModelForm())
  const [savingEdit, setSavingEdit] = useState(false)
  const [credentialOpen, setCredentialOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<ModelCredential | null>(null)
  const [credentialForm, setCredentialForm] = useState(emptyCredentialForm())
  const [credentialSaving, setCredentialSaving] = useState(false)

  const formLabels = {
    connectionMode: t('dashboard:model.byokFormConnectionMode'),
    connectionNew: t('dashboard:model.byokFormConnectionNew'),
    connectionExisting: t('dashboard:model.byokFormConnectionExisting'),
    connectionSelect: t('dashboard:model.byokFormConnectionSelect'),
    connectionReadonly: t('dashboard:model.byokFormConnectionReadonly'),
    connectionExistingEmpty: t('dashboard:model.byokFormConnectionExistingEmpty'),
    credentialLabel: t('dashboard:model.byokFormCredentialLabel'),
    preset: t('model.formPreset'),
    code: t('model.formCode'),
    displayName: t('model.formDisplayName'),
    provider: t('model.formProvider'),
    protocol: t('model.formProtocol'),
    modelName: t('model.formModelName'),
    baseUrl: t('model.formBaseUrl'),
    apiKey: t('model.formApiKey'),
    apiKeyOptional: t('model.formApiKeyOptional'),
    plans: t('model.plansLabel'),
  }

  const credentialFormLabels = {
    preset: t('model.formPreset'),
    label: t('dashboard:model.credentialFormLabel'),
    provider: t('model.formProvider'),
    protocol: t('model.formProtocol'),
    baseUrl: t('model.formBaseUrl'),
    apiKey: t('model.formApiKey'),
    apiKeyOptional: t('model.formApiKeyOptional'),
  }

  const cardLabels = {
    defaultBadge: t('model.defaultBadge'),
    plansLabel: t('model.plansLabel'),
    plansNone: t('model.plansNone'),
    test: t('model.test'),
    testing: t('model.testing'),
    testOk: t('model.testOkShort'),
    testFail: t('model.testFailShort'),
    edit: t('model.editBtn'),
    setDefault: t('model.setDefault'),
    deleteBtn: t('model.deleteBtn'),
    moveUp: t('model.moveUp'),
    moveDown: t('model.moveDown'),
  }

  const load = useCallback(async () => {
    try {
      const [modelList, credList] = await Promise.all([
        adminListModels(type),
        adminListCredentials(type),
      ])
      setModels(modelList)
      setCredentials(credList)
    } catch (e) {
      setModels([])
      setCredentials([])
      appToast.error(e instanceof Error ? e.message : t('model.loadFail'))
    }
  }, [t, type])

  useEffect(() => {
    setModels(null)
    setSearch('')
    setTestResults({})
    void load()
  }, [load])

  const filteredModels = useMemo(
    () => (models ? filterAiModels(models, search) : []),
    [models, search],
  )

  const modelsByCredential = useMemo(() => {
    const map = new Map<string, AiModel[]>()
    for (const m of filteredModels) {
      const key = m.credentialId || '__legacy__'
      const list = map.get(key) ?? []
      list.push(m)
      map.set(key, list)
    }
    return map
  }, [filteredModels])

  const legacyModels = modelsByCredential.get('__legacy__') ?? []
  const showGrouped = !search.trim()

  const persistOrder = async (next: AiModel[]) => {
    setModels(next)
    try {
      await adminReorderModels(type, next.map((m) => m.id))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('model.reorderFail'))
      await load()
    }
  }

  const handleMove = async (id: string, direction: -1 | 1) => {
    if (!models) return
    const idx = models.findIndex((m) => m.id === id)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= models.length) return
    const next = [...models]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    setBusy(id)
    try {
      await persistOrder(next)
    } finally {
      setBusy(null)
    }
  }

  const handleSetDefault = async (id: string) => {
    setBusy(id)
    try {
      await adminSetDefault(id)
      await load()
      appToast.success(t('model.setDefaultOk'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('model.actionFail'))
    } finally {
      setBusy(null)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const r = await adminTestModel(id)
      const result: ModelTestResult = { ok: r.ok, error: r.error, latencyMs: r.latencyMs }
      setTestResults((prev) => ({ ...prev, [id]: result }))
      if (r.ok) appToast.success(t('model.testOk'))
      else appToast.error(r.error || t('model.testFail'))
    } catch (e) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, error: e instanceof Error ? e.message : t('model.testFail') },
      }))
      appToast.error(e instanceof Error ? e.message : t('model.testFail'))
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (model: AiModel) => {
    const ok = await confirmAction({
      title: t('model.deleteTitle'),
      description: t('model.deleteDesc', { name: model.displayName }),
      confirmLabel: t('model.deleteBtn'),
      danger: true,
    })
    if (!ok) return
    setBusy(model.id)
    try {
      await adminDeleteModel(model.id)
      await load()
      appToast.success(t('model.deleteOk'))
    } catch {
      appToast.error(t('model.deleteFail'))
    } finally {
      setBusy(null)
    }
  }

  const openCreateModel = (credentialId = '') => {
    setCreateForm(emptyAdminModelForm(credentialId))
    setCreateOpen(true)
  }

  const openEdit = (model: AiModel) => {
    setEditing(model)
    setEditForm(aiModelToAdminForm(model))
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

  const handleDeleteCredential = async (cred: ModelCredential) => {
    const ok = await confirmAction({
      title: t('dashboard:model.credentialDeleteTitle'),
      description: t('dashboard:model.credentialDeleteDesc', { name: cred.label }),
      confirmLabel: t('dashboard:model.credentialDeleteBtn'),
      danger: true,
    })
    if (!ok) return
    try {
      await adminDeleteCredential(cred.id)
      await load()
      appToast.success(t('dashboard:model.credentialDeleted'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('dashboard:model.credentialDeleteFail'))
    }
  }

  const handleSaveCredential = async () => {
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
        await adminUpdateCredential(editingCredential.id, payload)
        appToast.success(t('dashboard:model.credentialUpdated'))
      } else {
        await adminCreateCredential(type, { ...payload, apiKey: credentialForm.apiKey.trim() })
        appToast.success(t('dashboard:model.credentialCreated'))
      }
      setCredentialOpen(false)
      setEditingCredential(null)
      setCredentialForm(emptyCredentialForm())
      await load()
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('dashboard:model.credentialCreateFail'))
    } finally {
      setCredentialSaving(false)
    }
  }

  const buildModelPayload = (form: AdminModelFormState, editingModel?: AiModel | null) => {
    const useExisting = form.credentialMode === 'existing' || Boolean(editingModel?.credentialId)
    return {
      code: form.code.trim(),
      displayName: form.displayName.trim(),
      modelType: type,
      protocol: MODEL_PROTOCOL,
      modelName: form.modelName.trim() || form.code.trim(),
      priceMultiplier: adminFormPriceMultiplier(form),
      ...(useExisting
        ? { credentialId: form.credentialId || editingModel?.credentialId || undefined }
        : {
            provider: form.provider.trim(),
            baseUrl: form.baseUrl.trim(),
            apiKey: form.apiKey.trim() || undefined,
            credentialLabel: form.credentialLabel.trim() || undefined,
          }),
    }
  }

  const handleCreate = async () => {
    const useExisting = createForm.credentialMode === 'existing'
    if (!createForm.code.trim() || !createForm.displayName.trim() || !createForm.modelName.trim()) {
      appToast.error(t('model.createRequired'))
      return
    }
    if (!adminFormMultiplierValid(createForm)) {
      appToast.error(t('model.multiplierInvalid'))
      return
    }
    if (useExisting && !createForm.credentialId) {
      appToast.error(t('dashboard:model.byokFormConnectionSelect'))
      return
    }
    if (!useExisting && !createForm.apiKey.trim()) {
      appToast.error(t('model.createRequired'))
      return
    }
    setCreating(true)
    try {
      const created = await adminCreateModel({
        ...buildModelPayload(createForm),
        active: true,
        sortOrder: models?.length ?? 0,
      })
      await adminSetPlans(created.id, createForm.planCodes)
      setCreateOpen(false)
      setCreateForm(emptyAdminModelForm())
      await load()
      appToast.success(t('model.createOk'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('model.createFail'))
    } finally {
      setCreating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (!editForm.displayName.trim()) {
      appToast.error(t('model.editRequired'))
      return
    }
    if (!adminFormMultiplierValid(editForm)) {
      appToast.error(t('model.multiplierInvalid'))
      return
    }
    setSavingEdit(true)
    try {
      await adminUpdateModel(editing.id, {
        ...buildModelPayload(editForm, editing),
        code: editing.code,
        active: editing.active,
        sortOrder: editing.sortOrder,
      })
      await adminSetPlans(editing.id, editForm.planCodes)
      setEditing(null)
      await load()
      appToast.success(t('model.editOk'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('model.editFail'))
    } finally {
      setSavingEdit(false)
    }
  }

  const renderModelCard = (m: AiModel) => (
    <ModelAdminCard
      key={m.id}
      model={m}
      busy={busy === m.id}
      testing={testingId === m.id}
      testResult={testResults[m.id]}
      labels={cardLabels}
      onTest={() => void handleTest(m.id)}
      onEdit={() => openEdit(m)}
      onSetDefault={() => void handleSetDefault(m.id)}
      onDelete={() => void handleDelete(m)}
    />
  )

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow={t('common:nav.adminModels')}
        title={t('model.title')}
        icon={ProIconAdminSystem}
      />
      <p className="font-mono text-sm text-muted-foreground">{t('model.description')}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => setType(ty)}
              className={cn(
                'border-2 border-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-soft transition-colors',
                type === ty ? 'bg-neon text-ink' : 'bg-white text-ink hover:bg-neon/30',
              )}
            >
              {t(`model.types.${ty}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openCreateCredential} className={modelPixelActionBtnClass()}>
            {t('dashboard:model.addCredential')}
          </button>
          <button type="button" onClick={() => openCreateModel()} className={modelPixelActionBtnClass()}>
            {t('model.addModel')}
          </button>
        </div>
      </div>

      {models && models.length > 0 ? (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('model.searchPlaceholder')}
            className="border-2 border-black pl-9 font-mono text-sm shadow-soft"
          />
        </div>
      ) : null}

      {models === null ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : models.length === 0 && credentials.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-2 border-dashed border-black/40 bg-muted/20 px-4 py-8">
          <p className="font-mono text-sm text-muted-foreground">{t('model.empty')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCreateCredential} className={modelPixelActionBtnClass()}>
              {t('dashboard:model.addCredential')}
            </button>
            <button type="button" onClick={() => openCreateModel()} className={modelPixelActionBtnClass()}>
              {t('model.addModel')}
            </button>
          </div>
        </div>
      ) : showGrouped ? (
        <div className="space-y-3">
          {credentials.map((cred) => {
            const credModels = modelsByCredential.get(cred.id) ?? []
            return (
              <div key={cred.id} className="space-y-2">
                <ModelCredentialCard
                  credential={cred}
                  addModelLabel={t('dashboard:model.credentialAddModel')}
                  editLabel={t('dashboard:model.credentialEditBtn')}
                  deleteLabel={t('dashboard:model.credentialDeleteBtn')}
                  modelCountLabel={t('dashboard:model.credentialModelCount')}
                  onAddModel={() => openCreateModel(cred.id)}
                  onEdit={() => openEditCredential(cred)}
                  onDelete={() => void handleDeleteCredential(cred)}
                />
                {credModels.length > 0 ? (
                  <div className="ml-3 space-y-2 border-l-2 border-foreground/20 pl-3">
                    {credModels.map(renderModelCard)}
                  </div>
                ) : (
                  <div className="ml-3 flex flex-wrap items-center gap-2 border-l-2 border-dashed border-foreground/15 pl-3">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t('dashboard:model.credentialNoModels')}
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreateModel(cred.id)}
                      className={modelPixelActionBtnClass('h-7 px-2')}
                    >
                      {t('dashboard:model.credentialAddModel')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {legacyModels.length > 0 ? (
            <div className="space-y-2">
              <p className="font-mono text-[11px] font-bold uppercase text-muted-foreground">
                {t('dashboard:model.byokLegacyGroup')}
              </p>
              {search.trim() ? (
                <div className="space-y-3">{legacyModels.map(renderModelCard)}</div>
              ) : (
                <ModelAdminSortableList
                  models={legacyModels}
                  busyId={busy}
                  testingId={testingId}
                  testResults={testResults}
                  labels={cardLabels}
                  onReorder={(next) => {
                    if (!models) return
                    const credIds = new Set(credentials.map((c) => c.id))
                    const credModelsFlat = models.filter((m) => m.credentialId && credIds.has(m.credentialId))
                    void persistOrder([...next, ...credModelsFlat])
                  }}
                  onTest={(id) => void handleTest(id)}
                  onEdit={openEdit}
                  onSetDefault={(id) => void handleSetDefault(id)}
                  onDelete={(m) => void handleDelete(m)}
                  onMove={(id, dir) => void handleMove(id, dir)}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="border-2 border-dashed border-black/40 bg-muted/20 px-4 py-8 text-center font-mono text-sm text-muted-foreground">
          {t('model.searchEmpty')}
        </div>
      ) : (
        <div className="space-y-3">{filteredModels.map(renderModelCard)}</div>
      )}

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
            {t('model.createCancel')}
          </Button>
          <Button onClick={() => void handleSaveCredential()} disabled={credentialSaving}>
            {credentialSaving ? t('model.creating') : t('model.createSubmit')}
          </Button>
        </DialogFooter>
      </AppModalShell>

      <AppModalShell
        open={createOpen}
        onOpenChange={setCreateOpen}
        size="form"
        title={t('model.createTitle')}
        description={t('model.createDesc')}
      >
        <ModelAdminCreateFormFields
          form={createForm}
          onChange={setCreateForm}
          credentials={credentials}
          labels={formLabels}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
            {t('model.createCancel')}
          </Button>
          <Button onClick={() => void handleCreate()} disabled={creating}>
            {creating ? t('model.creating') : t('model.createSubmit')}
          </Button>
        </DialogFooter>
      </AppModalShell>

      <AppModalShell
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        size="form"
        title={t('model.editTitle')}
        description={t('model.editDesc', { name: editing?.displayName ?? '' })}
      >
        <ModelAdminCreateFormFields
          form={editForm}
          onChange={setEditForm}
          credentials={credentials}
          editing
          editingCredentialId={editing?.credentialId}
          labels={formLabels}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>
            {t('model.createCancel')}
          </Button>
          <Button onClick={() => void handleSaveEdit()} disabled={savingEdit}>
            {savingEdit ? t('model.saving') : t('model.editSubmit')}
          </Button>
        </DialogFooter>
      </AppModalShell>
    </AppPageStack>
  )
}
