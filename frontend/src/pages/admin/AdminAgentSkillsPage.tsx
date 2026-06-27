import { useCallback, useEffect, useState } from 'react'
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
  createAdminAgentSkill,
  deleteAdminAgentSkill,
  fetchAdminAgentSkill,
  fetchAdminAgentSkills,
  updateAdminAgentSkill,
} from '@/api/adminAgentSkillApi'
import type { AgentSkillDetail, AgentSkillSummary } from '@/types/agentSkill'
import { SkillEditDialog } from '@/pages/dashboard/skills/SkillEditDialog'

function formatUpdatedAt(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export default function AdminAgentSkillsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()

  const [skills, setSkills] = useState<AgentSkillSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AgentSkillDetail | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchAdminAgentSkills()
      setSkills(list)
    } catch {
      appToast.error(t('admin:skills.loadFail'))
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = async (row: AgentSkillSummary) => {
    try {
      const detail = await fetchAdminAgentSkill(row.id)
      setEditing(detail)
      setDialogOpen(true)
    } catch {
      appToast.error(t('admin:skills.loadFail'))
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
        await updateAdminAgentSkill(editing.id, {
          version: editing.version,
          description: values.description || undefined,
          content: values.content,
          locale: values.locale,
        })
        appToast.success(t('admin:skills.updateSuccess'))
      } else {
        await createAdminAgentSkill({
          name: values.name,
          description: values.description || undefined,
          content: values.content,
          locale: values.locale,
        })
        appToast.success(t('admin:skills.createSuccess'))
      }
      setDialogOpen(false)
      await load()
    } catch {
      appToast.error(t('admin:skills.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: AgentSkillSummary) => {
    const ok = await confirmAction({
      title: t('admin:skills.deleteTitle'),
      description: t('admin:skills.deleteDesc', { name: row.name }),
      danger: true,
      confirmLabel: t('admin:skills.deleteConfirm'),
    })
    if (!ok) return
    try {
      await deleteAdminAgentSkill(row.id)
      appToast.success(t('admin:skills.deleteSuccess'))
      await load()
    } catch {
      appToast.error(t('admin:skills.deleteFail'))
    }
  }

  const columns: ProColumn<AgentSkillSummary>[] = [
    {
      key: 'name',
      header: t('admin:skills.colName'),
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
      header: t('admin:skills.colLocale'),
      render: (row) => (
        <span className="text-muted-foreground">
          {row.locale === 'en' ? t('admin:skills.localeEn') : t('admin:skills.localeZh')}
        </span>
      ),
    },
    {
      key: 'version',
      header: t('admin:skills.colVersion'),
      render: (row) => <span className="font-mono text-muted-foreground">v{row.version}</span>,
    },
    {
      key: 'updatedAt',
      header: t('admin:skills.colUpdatedAt'),
      render: (row) => (
        <span className="text-muted-foreground">{formatUpdatedAt(row.updatedAt)}</span>
      ),
    },
    {
      key: 'action',
      header: t('admin:skills.colActions'),
      align: 'right',
      render: (row) => (
        <TableActionBar align="end">
          <TableActionButton variant="outline" onClick={() => void openEdit(row)}>
            {t('admin:skills.edit')}
          </TableActionButton>
          <TableActionButton variant="outline" onClick={() => void handleDelete(row)}>
            {t('admin:skills.delete')}
          </TableActionButton>
        </TableActionBar>
      ),
    },
  ]

  const showEmpty = !loading && skills.length === 0

  return (
    <AppPageStack className="gap-8">
      <SkillEditDialog
        open={dialogOpen}
        skill={editing}
        readOnly={false}
        saving={saving}
        i18nNamespace="admin"
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />

      <AppPageIntro
        eyebrow={t('admin:skills.eyebrow')}
        title={t('admin:skills.title')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(APP_BTN_MD, 'gap-2 normal-case')}
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              {t('admin:skills.refresh')}
            </Button>
            <Button type="button" className={cn(APP_BTN_MD, 'gap-2')} onClick={openCreate}>
              <Plus className="size-4" />
              {t('admin:skills.create')}
            </Button>
          </div>
        }
      />

      <AppShellCard>
        <AppShellCardHeader
          title={t('admin:skills.sectionList')}
          description={t('admin:skills.description')}
        />
        <AppShellCardBody>
          {showEmpty ? (
            <AppEmptyState
              icon={Sparkles}
              title={t('admin:skills.emptyTitle')}
              description={t('admin:skills.emptyDesc')}
              action={
                <Button type="button" className={APP_BTN_MD} onClick={openCreate}>
                  <Plus className="mr-2 size-4" />
                  {t('admin:skills.createFirst')}
                </Button>
              }
            />
          ) : (
            <ProTable
              columns={columns}
              data={skills}
              rowKey="id"
              loading={loading}
              embedded
              dense
              emptyText={t('admin:skills.emptyTitle')}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
