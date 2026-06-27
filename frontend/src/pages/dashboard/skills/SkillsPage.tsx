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
  createAgentSkill,
  deleteAgentSkill,
  fetchAgentSkill,
  fetchAgentSkills,
  updateAgentSkill,
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

  const [skills, setSkills] = useState<AgentSkillSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AgentSkillDetail | null>(null)
  const [readOnly, setReadOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchAgentSkills()
      setSkills(list)
    } catch {
      appToast.error(t('dashboard:skills.loadFail'))
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
    if (row.isSystem) return
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

  const columns: ProColumn<AgentSkillSummary>[] = [
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
      key: 'isSystem',
      header: t('dashboard:skills.colSystem'),
      render: (row) => (
        <span className="text-muted-foreground">
          {row.isSystem ? t('dashboard:skills.systemYes') : t('dashboard:skills.systemNo')}
        </span>
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
          {!row.isSystem ? (
            <TableActionButton variant="outline" onClick={() => void handleDelete(row)}>
              {t('dashboard:skills.delete')}
            </TableActionButton>
          ) : null}
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
          title={t('dashboard:skills.sectionList')}
          description={t('dashboard:skills.description')}
        />
        <AppShellCardBody>
          {showEmpty ? (
            <AppEmptyState
              icon={Sparkles}
              title={t('dashboard:skills.emptyTitle')}
              description={t('dashboard:skills.emptyDesc')}
              action={
                <Button type="button" className={APP_BTN_MD} onClick={openCreate}>
                  <Plus className="mr-2 size-4" />
                  {t('dashboard:skills.createFirst')}
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
              emptyText={t('dashboard:skills.emptyTitle')}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
