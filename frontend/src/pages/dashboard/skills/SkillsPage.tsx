import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Sparkles } from 'lucide-react'
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
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { confirmAction } from '@/stores/appDialog'
import { appToast } from '@/stores/appToastStore'
import {
  createAgentSkill,
  deleteAgentSkill,
  ensureAgentSkillRef,
  fetchAgentSkill,
  fetchAgentSkillLibrary,
  fetchOfficialAgentSkills,
  removeAgentSkillRef,
  setAgentSkillEnabled,
  updateAgentSkill,
  updateAgentSkillRef,
} from '@/api/agentSkillApi'
import type { AgentSkillDetail, AgentSkillSummary } from '@/types/agentSkill'
import { SkillEditDialog } from './SkillEditDialog'

function formatUpdatedAt(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export default function SkillsPage() {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()

  const [library, setLibrary] = useState<AgentSkillSummary[]>([])
  const [official, setOfficial] = useState<AgentSkillSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AgentSkillDetail | null>(null)
  const [readOnly, setReadOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lib, catalog] = await Promise.all([
        fetchAgentSkillLibrary(),
        fetchOfficialAgentSkills(),
      ])
      setLibrary(lib)
      setOfficial(catalog)
    } catch {
      appToast.error(t('dashboard:skills.loadFail'))
      setLibrary([])
      setOfficial([])
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
    setDialogOpen(true)
  }

  const openEdit = async (row: AgentSkillSummary) => {
    try {
      const detail = await fetchAgentSkill(row.id)
      setEditing(detail)
      setReadOnly(row.isSystem)
      setDialogOpen(true)
    } catch {
      appToast.error(t('dashboard:skills.loadFail'))
    }
  }

  const handleSave = async (values: {
    name: string
    description: string
    content: string
    locale: string
  }) => {
    setSaving(true)
    try {
      if (editing) {
        await updateAgentSkill(editing.id, {
          version: editing.version,
          description: values.description || undefined,
          content: values.content,
          locale: values.locale,
        })
        appToast.success(t('dashboard:skills.updateSuccess'))
      } else {
        await createAgentSkill({
          name: values.name,
          description: values.description || undefined,
          content: values.content,
          locale: values.locale,
        })
        appToast.success(t('dashboard:skills.createSuccess'))
      }
      setDialogOpen(false)
      await load()
    } catch {
      appToast.error(t('dashboard:skills.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: AgentSkillSummary) => {
    const ok = await confirmAction({
      title: t('dashboard:skills.deleteTitle'),
      description: t('dashboard:skills.deleteDesc', { name: row.name }),
      danger: true,
      confirmLabel: t('dashboard:skills.deleteConfirm'),
    })
    if (!ok) return
    try {
      await deleteAgentSkill(row.id)
      appToast.success(t('dashboard:skills.deleteSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:skills.deleteFail'))
    }
  }

  const handleReference = async (row: AgentSkillSummary) => {
    try {
      await ensureAgentSkillRef(row.id)
      appToast.success(t('dashboard:skills.referenceSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:skills.saveFail'))
    }
  }

  const handleUnreference = async (row: AgentSkillSummary) => {
    const ok = await confirmAction({
      title: t('dashboard:skills.unreferenceTitle'),
      description: t('dashboard:skills.unreferenceDesc', { name: row.name }),
      danger: true,
      confirmLabel: t('dashboard:skills.unreferenceConfirm'),
    })
    if (!ok) return
    try {
      await removeAgentSkillRef(row.id)
      appToast.success(t('dashboard:skills.unreferenceSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:skills.saveFail'))
    }
  }

  const handlePullLatest = async (row: AgentSkillSummary) => {
    try {
      await updateAgentSkillRef(row.id, { pullLatest: true })
      appToast.success(t('dashboard:skills.pullLatestSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:skills.saveFail'))
    }
  }

  const handleToggleAutoUpdate = async (row: AgentSkillSummary) => {
    try {
      await updateAgentSkillRef(row.id, { autoUpdate: !row.autoUpdate })
      appToast.success(t('dashboard:skills.refUpdateSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:skills.saveFail'))
    }
  }

  const handleToggleEnabled = async (row: AgentSkillSummary) => {
    const enabled = row.enabled !== false
    try {
      if (row.isSystem) {
        await updateAgentSkillRef(row.id, { enabled: !enabled })
      } else {
        await setAgentSkillEnabled(row.id, !enabled)
      }
      appToast.success(t('dashboard:skills.enabledUpdateSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:skills.saveFail'))
    }
  }

  const libraryColumns: ProColumn<AgentSkillSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('dashboard:skills.colName'),
        render: (row) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate font-medium text-foreground">
              <span className="truncate">{row.name}</span>
              {row.isSystem && row.inLibrary && row.updateAvailable ? (
                <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  {t('dashboard:skills.updateBadge', {
                    pinned: row.pinnedVersion ?? row.version,
                    latest: row.version,
                  })}
                </span>
              ) : null}
            </div>
            {row.description ? (
              <div className="truncate text-xs text-muted-foreground">{row.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'type',
        header: t('dashboard:skills.colSource'),
        render: (row) => (
          <span className="text-muted-foreground">
            {row.isSystem ? t('dashboard:skills.sourceOfficial') : t('dashboard:skills.sourceCustom')}
          </span>
        ),
      },
      {
        key: 'version',
        header: t('dashboard:skills.colVersion'),
        render: (row) => (
          <span className="font-mono text-muted-foreground">
            {row.isSystem
              ? t('dashboard:skills.versionPinned', {
                  pinned: row.pinnedVersion ?? row.version,
                  latest: row.version,
                })
              : `v${row.version}`}
          </span>
        ),
      },
      {
        key: 'enabled',
        header: t('dashboard:skills.colEnabled'),
        render: (row) => (
          <TableActionButton variant="outline" onClick={() => void handleToggleEnabled(row)}>
            {row.enabled === false
              ? t('dashboard:skills.enabledOff')
              : t('dashboard:skills.enabledOn')}
          </TableActionButton>
        ),
      },
      {
        key: 'updatedAt',
        header: t('dashboard:skills.colUpdatedAt'),
        render: (row) => (
          <span className="text-muted-foreground">{formatUpdatedAt(row.updatedAt)}</span>
        ),
      },
      {
        key: 'action',
        header: t('dashboard:skills.colActions'),
        align: 'right',
        render: (row) => (
          <TableActionBar align="end">
            <TableActionButton variant="outline" onClick={() => void openEdit(row)}>
              {row.isSystem ? t('dashboard:skills.view') : t('dashboard:skills.edit')}
            </TableActionButton>
            {row.isSystem && row.updateAvailable ? (
              <TableActionButton variant="outline" onClick={() => void handlePullLatest(row)}>
                {t('dashboard:skills.pullLatest')}
              </TableActionButton>
            ) : null}
            {row.isSystem ? (
              <TableActionButton variant="outline" onClick={() => void handleToggleAutoUpdate(row)}>
                {row.autoUpdate
                  ? t('dashboard:skills.autoUpdateOn')
                  : t('dashboard:skills.autoUpdateOff')}
              </TableActionButton>
            ) : null}
            {row.isSystem ? (
              <TableActionButton variant="outline" onClick={() => void handleUnreference(row)}>
                {t('dashboard:skills.unreference')}
              </TableActionButton>
            ) : (
              <TableActionButton variant="outline" onClick={() => void handleDelete(row)}>
                {t('dashboard:skills.delete')}
              </TableActionButton>
            )}
          </TableActionBar>
        ),
      },
    ],
    [t],
  )

  const officialColumns: ProColumn<AgentSkillSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('dashboard:skills.colName'),
        render: (row) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{row.name}</div>
            {row.description ? (
              <div className="truncate text-xs text-muted-foreground">{row.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'locale',
        header: t('dashboard:skills.colLocale'),
        render: (row) => (
          <span className="text-muted-foreground">
            {row.locale === 'en' ? t('dashboard:skills.localeEn') : t('dashboard:skills.localeZh')}
          </span>
        ),
      },
      {
        key: 'version',
        header: t('dashboard:skills.colLatestVersion'),
        render: (row) => <span className="font-mono text-muted-foreground">v{row.version}</span>,
      },
      {
        key: 'action',
        header: t('dashboard:skills.colActions'),
        align: 'right',
        render: (row) => (
          <TableActionBar align="end">
            <TableActionButton variant="outline" onClick={() => void openEdit(row)}>
              {t('dashboard:skills.preview')}
            </TableActionButton>
            {row.inLibrary ? (
              <span className="px-2 text-xs text-muted-foreground">{t('dashboard:skills.referenced')}</span>
            ) : (
              <TableActionButton variant="outline" onClick={() => void handleReference(row)}>
                {t('dashboard:skills.reference')}
              </TableActionButton>
            )}
          </TableActionBar>
        ),
      },
    ],
    [t],
  )

  const libraryEmpty = !loading && library.length === 0

  return (
    <AppPageStack className="gap-8">
      <SkillEditDialog
        open={dialogOpen}
        skill={editing}
        readOnly={readOnly}
        saving={saving}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />

      <AppPageIntro
        eyebrow={t('dashboard:skills.eyebrow')}
        title={t('dashboard:skills.title')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(APP_BTN_MD, 'gap-2 normal-case')}
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              {t('dashboard:skills.refresh')}
            </Button>
            <Button type="button" className={cn(APP_BTN_MD, 'gap-2')} onClick={openCreate}>
              <Plus className="size-4" />
              {t('dashboard:skills.create')}
            </Button>
          </div>
        }
      />

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:skills.sectionLibrary')}
          description={t('dashboard:skills.sectionLibraryDesc')}
        />
        <AppShellCardBody>
          {libraryEmpty ? (
            <AppEmptyState
              icon={Sparkles}
              title={t('dashboard:skills.emptyLibraryTitle')}
              description={t('dashboard:skills.emptyLibraryDesc')}
              action={
                <Button type="button" className={APP_BTN_MD} onClick={openCreate}>
                  <Plus className="mr-2 size-4" />
                  {t('dashboard:skills.createFirst')}
                </Button>
              }
            />
          ) : (
            <ProTable
              columns={libraryColumns}
              data={library}
              rowKey="id"
              loading={loading}
              embedded
              dense
              emptyText={t('dashboard:skills.emptyLibraryTitle')}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:skills.sectionOfficial')}
          description={t('dashboard:skills.sectionOfficialDesc')}
        />
        <AppShellCardBody>
          {!loading && official.length === 0 ? (
            <AppEmptyState
              icon={Sparkles}
              title={t('dashboard:skills.emptyOfficialTitle')}
              description={t('dashboard:skills.emptyOfficialDesc')}
            />
          ) : (
            <ProTable
              columns={officialColumns}
              data={official}
              rowKey="id"
              loading={loading}
              embedded
              dense
              emptyText={t('dashboard:skills.emptyOfficialTitle')}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
