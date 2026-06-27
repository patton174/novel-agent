import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Workflow } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AppEmptyState,
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { ProTable, type ProColumn } from '@/components/pro/ProTable'
import { TableActionBar, TableActionButton } from '@/components/shared/TableActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/stores/appDialog'
import { appToast } from '@/stores/appToastStore'
import {
  createCrewTemplate,
  deleteCrewTemplate,
  fetchCrewTemplate,
  fetchCrewTemplates,
  updateCrewTemplate,
  validateCrewStages,
} from '@/api/crewApi'
import type { CrewStageDef, CrewTemplateDetail, CrewTemplateSummary } from '@/types/crew'

const DEFAULT_STAGES_JSON = `[
  {
    "key": "plan",
    "profileId": "main-editor",
    "gate": "always",
    "onFail": "abort_with_report"
  }
]`

export default function CrewTemplateAdminPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()

  const [crews, setCrews] = useState<CrewTemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CrewTemplateDetail | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [stagesJson, setStagesJson] = useState(DEFAULT_STAGES_JSON)
  const [validateErrors, setValidateErrors] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchCrewTemplates()
      setCrews(list)
    } catch {
      appToast.error(t('admin:crew.loadFail'))
      setCrews([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setReadOnly(false)
    setDisplayName('')
    setDescription('')
    setStagesJson(DEFAULT_STAGES_JSON)
    setValidateErrors([])
    setDialogOpen(true)
  }

  const openEdit = async (row: CrewTemplateSummary) => {
    try {
      const detail = await fetchCrewTemplate(row.id)
      setEditing(detail)
      setReadOnly(row.isSystem)
      setDisplayName(detail.displayName)
      setDescription(detail.description ?? '')
      setStagesJson(JSON.stringify(detail.stages, null, 2))
      setValidateErrors([])
      setDialogOpen(true)
    } catch {
      appToast.error(t('admin:crew.loadFail'))
    }
  }

  const parseStages = (): CrewStageDef[] | null => {
    try {
      const parsed = JSON.parse(stagesJson) as unknown
      if (!Array.isArray(parsed)) throw new Error('stages must be array')
      return parsed as CrewStageDef[]
    } catch {
      appToast.error(t('admin:crew.invalidJson'))
      return null
    }
  }

  const handleValidate = async () => {
    const stages = parseStages()
    if (!stages) return
    setValidating(true)
    try {
      const result = validateCrewStages(stages)
      setValidateErrors(result.errors)
      if (result.valid) {
        appToast.success(t('admin:crew.validateOk'))
      } else {
        appToast.error(t('admin:crew.validateErrors', { count: result.errors.length }))
      }
    } catch {
      appToast.error(t('admin:crew.validateFail'))
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    const stages = parseStages()
    if (!stages || !displayName.trim()) return
    setSaving(true)
    try {
      const payload = {
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        stages,
      }
      if (editing) {
        await updateCrewTemplate(editing.id, payload)
        appToast.success(t('admin:crew.updateSuccess'))
      } else {
        await createCrewTemplate(payload)
        appToast.success(t('admin:crew.createSuccess'))
      }
      setDialogOpen(false)
      await load()
    } catch {
      appToast.error(t('admin:crew.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: CrewTemplateSummary) => {
    if (row.isSystem) return
    const ok = await confirmAction({
      title: t('admin:crew.deleteTitle'),
      description: t('admin:crew.deleteDesc', { name: row.displayName }),
      danger: true,
      confirmLabel: t('admin:crew.deleteConfirm'),
    })
    if (!ok) return
    try {
      await deleteCrewTemplate(row.id)
      appToast.success(t('admin:crew.deleteSuccess'))
      await load()
    } catch {
      appToast.error(t('admin:crew.deleteFail'))
    }
  }

  const columns: ProColumn<CrewTemplateSummary>[] = [
    {
      key: 'displayName',
      header: t('admin:crew.colName'),
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{row.displayName}</div>
          <div className="truncate text-xs text-muted-foreground">{row.id}</div>
        </div>
      ),
    },
    {
      key: 'stageCount',
      header: t('admin:crew.colStages'),
      render: (row) => <span className="text-muted-foreground">{row.stageCount}</span>,
    },
    {
      key: 'isSystem',
      header: t('admin:crew.colSystem'),
      render: (row) => (
        <span className="text-muted-foreground">
          {row.isSystem ? t('admin:crew.systemYes') : t('admin:crew.systemNo')}
        </span>
      ),
    },
    {
      key: 'action',
      header: t('admin:crew.colActions'),
      align: 'right',
      render: (row) => (
        <TableActionBar align="end">
          <TableActionButton variant="outline" onClick={() => void openEdit(row)}>
            {row.isSystem ? t('admin:crew.view') : t('admin:crew.edit')}
          </TableActionButton>
          {!row.isSystem ? (
            <TableActionButton variant="outline" onClick={() => void handleDelete(row)}>
              {t('admin:crew.delete')}
            </TableActionButton>
          ) : null}
        </TableActionBar>
      ),
    },
  ]

  const dialogTitle = readOnly
    ? t('admin:crew.viewTitle', { name: editing?.displayName })
    : editing
      ? t('admin:crew.editTitle', { name: editing.displayName })
      : t('admin:crew.createTitle')

  return (
    <AppPageStack className="gap-8">
      <AppModalShell open={dialogOpen} onOpenChange={setDialogOpen} size="form" title={dialogTitle}>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-1 py-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t('admin:crew.fieldName')}</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t('admin:crew.fieldDescription')}
            </label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t('admin:crew.fieldStages')}</label>
            <textarea
              value={stagesJson}
              onChange={(e) => setStagesJson(e.target.value)}
              disabled={readOnly}
              rows={14}
              className={cn(
                'w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            />
          </div>
          {validateErrors.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-destructive">
              {validateErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter className="mt-2 flex-wrap gap-2">
          {!readOnly ? (
            <Button
              type="button"
              variant="outline"
              className={APP_BTN_MD}
              disabled={validating}
              onClick={() => void handleValidate()}
            >
              {validating ? t('admin:crew.validating') : t('admin:crew.validate')}
            </Button>
          ) : null}
          <Button type="button" variant="outline" className={APP_BTN_MD} onClick={() => setDialogOpen(false)}>
            {readOnly ? t('admin:crew.close') : t('admin:crew.cancel')}
          </Button>
          {!readOnly ? (
            <Button
              type="button"
              className={APP_BTN_MD}
              disabled={saving || !displayName.trim()}
              onClick={() => void handleSave()}
            >
              {saving ? t('admin:crew.saving') : t('admin:crew.save')}
            </Button>
          ) : null}
        </DialogFooter>
      </AppModalShell>

      <AppPageIntro
        eyebrow={t('admin:crew.eyebrow')}
        title={t('admin:crew.title')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className={cn(APP_BTN_MD, 'gap-2')} onClick={() => void load()}>
              <RefreshCw className="size-4" />
              {t('admin:crew.refresh')}
            </Button>
            <Button type="button" className={cn(APP_BTN_MD, 'gap-2')} onClick={openCreate}>
              <Plus className="size-4" />
              {t('admin:crew.create')}
            </Button>
          </div>
        }
      />

      <AppShellCard>
        <AppShellCardHeader title={t('admin:crew.sectionList')} description={t('admin:crew.description')} />
        <AppShellCardBody>
          {!loading && crews.length === 0 ? (
            <AppEmptyState
              icon={Workflow}
              title={t('admin:crew.emptyTitle')}
              description={t('admin:crew.emptyDesc')}
            />
          ) : (
            <ProTable
              columns={columns}
              data={crews}
              rowKey="id"
              loading={loading}
              embedded
              dense
              emptyText={t('admin:crew.emptyTitle')}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
