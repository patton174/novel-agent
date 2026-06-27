import { useCallback, useEffect, useState } from 'react'
import { Copy, Plus, RefreshCw, Users } from 'lucide-react'
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
  cloneAgentProfile,
  createAgentProfile,
  deleteAgentProfile,
  fetchAgentProfile,
  fetchAgentProfiles,
  updateAgentProfile,
} from '@/api/agentProfileApi'
import type { AgentProfileSummary } from '@/types/agentProfile'
import { ProfileEditDialog } from './ProfileEditDialog'

export default function ProfileManagementPage() {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()

  const [profiles, setProfiles] = useState<AgentProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Awaited<ReturnType<typeof fetchAgentProfile>> | null>(null)
  const [readOnly, setReadOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchAgentProfiles()
      setProfiles(list)
    } catch {
      appToast.error(t('dashboard:agentProfiles.loadFail'))
      setProfiles([])
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

  const openEdit = async (row: AgentProfileSummary) => {
    try {
      const detail = await fetchAgentProfile(row.id)
      setEditing(detail)
      setReadOnly(row.isSystem)
      setDialogOpen(true)
    } catch {
      appToast.error(t('dashboard:agentProfiles.loadFail'))
    }
  }

  const handleClone = async (row: AgentProfileSummary) => {
    if (!row.isSystem) return
    try {
      await cloneAgentProfile(row.id)
      appToast.success(t('dashboard:agentProfiles.cloneSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:agentProfiles.cloneFail'))
    }
  }

  const handleSave = async (values: {
    displayName: string
    description: string
    systemPromptTemplate: string
    toolAllowlist: string[]
    maxTurns: number
    skillIds: string[]
  }) => {
    setSaving(true)
    try {
      if (editing) {
        await updateAgentProfile(editing.id, values)
        appToast.success(t('dashboard:agentProfiles.updateSuccess'))
      } else {
        await createAgentProfile(values)
        appToast.success(t('dashboard:agentProfiles.createSuccess'))
      }
      setDialogOpen(false)
      await load()
    } catch {
      appToast.error(t('dashboard:agentProfiles.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: AgentProfileSummary) => {
    if (row.isSystem) return
    const ok = await confirmAction({
      title: t('dashboard:agentProfiles.deleteTitle'),
      description: t('dashboard:agentProfiles.deleteDesc', { name: row.displayName }),
      danger: true,
      confirmLabel: t('dashboard:agentProfiles.deleteConfirm'),
    })
    if (!ok) return
    try {
      await deleteAgentProfile(row.id)
      appToast.success(t('dashboard:agentProfiles.deleteSuccess'))
      await load()
    } catch {
      appToast.error(t('dashboard:agentProfiles.deleteFail'))
    }
  }

  const columns: ProColumn<AgentProfileSummary>[] = [
    {
      key: 'displayName',
      header: t('dashboard:agentProfiles.colName'),
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{row.displayName}</div>
          <div className="truncate text-xs text-muted-foreground">{row.id}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: t('dashboard:agentProfiles.colDescription'),
      render: (row) => (
        <span className="line-clamp-2 text-muted-foreground">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'isSystem',
      header: t('dashboard:agentProfiles.colSystem'),
      render: (row) => (
        <span className="text-muted-foreground">
          {row.isSystem ? t('dashboard:agentProfiles.systemYes') : t('dashboard:agentProfiles.systemNo')}
        </span>
      ),
    },
    {
      key: 'maxTurns',
      header: t('dashboard:agentProfiles.colMaxTurns'),
      render: (row) => <span className="text-muted-foreground">{row.maxTurns ?? '—'}</span>,
    },
    {
      key: 'action',
      header: t('dashboard:agentProfiles.colActions'),
      align: 'right',
      render: (row) => (
        <TableActionBar align="end">
          {row.isSystem ? (
            <TableActionButton variant="outline" onClick={() => void handleClone(row)}>
              <Copy className="mr-1 size-3.5" />
              {t('dashboard:agentProfiles.clone')}
            </TableActionButton>
          ) : null}
          <TableActionButton variant="outline" onClick={() => void openEdit(row)}>
            {row.isSystem ? t('dashboard:agentProfiles.view') : t('dashboard:agentProfiles.edit')}
          </TableActionButton>
          {!row.isSystem ? (
            <TableActionButton variant="outline" onClick={() => void handleDelete(row)}>
              {t('dashboard:agentProfiles.delete')}
            </TableActionButton>
          ) : null}
        </TableActionBar>
      ),
    },
  ]

  return (
    <AppPageStack className="gap-8">
      <ProfileEditDialog
        open={dialogOpen}
        profile={editing}
        readOnly={readOnly}
        saving={saving}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />

      <AppPageIntro
        eyebrow={t('dashboard:agentProfiles.eyebrow')}
        title={t('dashboard:agentProfiles.title')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(APP_BTN_MD, 'gap-2 normal-case')}
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              {t('dashboard:agentProfiles.refresh')}
            </Button>
            <Button type="button" className={cn(APP_BTN_MD, 'gap-2')} onClick={openCreate}>
              <Plus className="size-4" />
              {t('dashboard:agentProfiles.create')}
            </Button>
          </div>
        }
      />

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:agentProfiles.sectionList')}
          description={t('dashboard:agentProfiles.description')}
        />
        <AppShellCardBody>
          {!loading && profiles.length === 0 ? (
            <AppEmptyState
              icon={Users}
              title={t('dashboard:agentProfiles.emptyTitle')}
              description={t('dashboard:agentProfiles.emptyDesc')}
              action={
                <Button type="button" className={APP_BTN_MD} onClick={openCreate}>
                  <Plus className="mr-2 size-4" />
                  {t('dashboard:agentProfiles.createFirst')}
                </Button>
              }
            />
          ) : (
            <ProTable
              columns={columns}
              data={profiles}
              rowKey="id"
              loading={loading}
              embedded
              dense
              emptyText={t('dashboard:agentProfiles.emptyTitle')}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
