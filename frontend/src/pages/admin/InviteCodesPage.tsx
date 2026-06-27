import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAdminInviteCode,
  disableAdminInviteCode,
  fetchAdminInviteCodes,
  formatInviteUses,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  updateAdminInviteCode,
  type AdminInviteCode,
  type AdminInviteCodeUpsertPayload,
  type InviteRewardType,
} from '@/api/inviteAdminApi'
import { fetchAdminPlans, type AdminPlan } from '@/api/billingAdminApi'
import {
  AdminButton,
  AdminButtonOutline,
  AdminStatusBadge,
} from '@/components/admin/AdminFormControls'
import {
  PixelCellMono,
  PixelCellText,
  PixelTable,
  PixelTableActionBar,
  PixelTableActionButton,
  type PixelColumn,
} from '@/components/pixel'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
} from '@/components/layout/AdminDataLayout'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { ProIconAdminUsers } from '@/components/pro/icons/proIcons'

const REWARD_TYPES: InviteRewardType[] = ['none', 'quota_bonus', 'plan_trial']

const emptyForm = (): AdminInviteCodeUpsertPayload => ({
  code: '',
  maxUses: 1,
  expiresAt: null,
  rewardType: 'none',
  rewardPayload: null,
})

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toLocaleString(locale)
}

export default function InviteCodesPage() {
  const { t, i18n } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [codes, setCodes] = useState<AdminInviteCode[] | null>(null)
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminInviteCode | null>(null)
  const [form, setForm] = useState<AdminInviteCodeUpsertPayload>(emptyForm())
  const [saving, setSaving] = useState(false)

  const loadCodes = useCallback(async () => {
    setLoading(true)
    try {
      const [list, planList] = await Promise.all([fetchAdminInviteCodes(), fetchAdminPlans()])
      setCodes(list)
      setPlans(planList)
    } catch (err) {
      setCodes([])
      appToast.error(err instanceof Error ? err.message : t('admin:invite.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadCodes()
  }, [loadCodes])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (item: AdminInviteCode) => {
    setEditing(item)
    setForm({
      code: item.code,
      maxUses: item.maxUses,
      expiresAt: item.expiresAt,
      rewardType: item.rewardType,
      rewardPayload: item.rewardPayload ? { ...item.rewardPayload } : null,
    })
    setDialogOpen(true)
  }

  const updateRewardPayload = (patch: Record<string, number | string | null | undefined>) => {
    setForm((prev) => ({
      ...prev,
      rewardPayload: { ...(prev.rewardPayload ?? {}), ...patch },
    }))
  }

  const handleSave = async () => {
    if (form.maxUses != null && form.maxUses < 0) {
      appToast.error(t('admin:invite.invalidMaxUses'))
      return
    }
    setSaving(true)
    try {
      const payload: AdminInviteCodeUpsertPayload = {
        maxUses: form.maxUses ?? 1,
        expiresAt: form.expiresAt ?? null,
        rewardType: form.rewardType ?? 'none',
        rewardPayload: form.rewardType === 'none' ? null : form.rewardPayload ?? {},
      }
      if (editing) {
        await updateAdminInviteCode(editing.id, payload)
        appToast.success(t('admin:invite.updated'))
      } else {
        await createAdminInviteCode({
          ...payload,
          code: form.code?.trim() || undefined,
        })
        appToast.success(t('admin:invite.created'))
      }
      await loadCodes()
      setDialogOpen(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:invite.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async (item: AdminInviteCode) => {
    if (
      !(await confirmAction({
        title: t('admin:invite.disableTitle'),
        description: t('admin:invite.disableDesc', { code: item.code }),
        confirmLabel: t('admin:invite.disableBtn'),
        danger: true,
      }))
    ) {
      return
    }
    try {
      await disableAdminInviteCode(item.id)
      await loadCodes()
      appToast.success(t('admin:invite.disabled'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:invite.disableFail'))
    }
  }

  const rewardLabel = (type: InviteRewardType) => t(`admin:invite.rewardType.${type}`)

  const list = codes ?? []

  const columns = useMemo((): PixelColumn<AdminInviteCode>[] => {
    return [
      {
        key: 'code',
        header: t('admin:invite.colCode'),
        render: (item) => <PixelCellMono>{item.code}</PixelCellMono>,
      },
      {
        key: 'uses',
        header: t('admin:invite.colUses'),
        render: (item) => (
          <PixelCellText muted>
            {formatInviteUses(item, t('admin:common.unlimitedSymbol'))}
          </PixelCellText>
        ),
      },
      {
        key: 'expires',
        header: t('admin:invite.colExpires'),
        render: (item) => (
          <PixelCellText muted>{formatDateTime(item.expiresAt, i18n.language)}</PixelCellText>
        ),
      },
      {
        key: 'reward',
        header: t('admin:invite.colReward'),
        render: (item) => <PixelCellText>{rewardLabel(item.rewardType)}</PixelCellText>,
      },
      {
        key: 'status',
        header: t('admin:invite.colStatus'),
        render: (item) => (
          <AdminStatusBadge tone={item.status === 'active' ? 'success' : 'neutral'}>
            {t(`admin:invite.status.${item.status}`)}
          </AdminStatusBadge>
        ),
      },
      {
        key: 'actions',
        header: t('admin:invite.colActions'),
        className: 'min-w-[200px]',
        render: (item) => (
          <PixelTableActionBar>
            <PixelTableActionButton onClick={() => openEdit(item)}>
              {t('admin:invite.edit')}
            </PixelTableActionButton>
            {item.status === 'active' ? (
              <PixelTableActionButton variant="danger" onClick={() => void handleDisable(item)}>
                {t('admin:invite.disableBtn')}
              </PixelTableActionButton>
            ) : null}
          </PixelTableActionBar>
        ),
      },
    ]
  }, [handleDisable, i18n.language, openEdit, rewardLabel, t])

  if (loading) {
    return (
      <AdminDataPage>
        <AdminDataPanel>
          <AdminDataPanelHeader title={t('admin:invite.title')} description={t('admin:invite.loading')} />
          <AdminDataPanelBody>
            <Skeleton className="h-40 w-full rounded-lg" />
          </AdminDataPanelBody>
        </AdminDataPanel>
      </AdminDataPage>
    )
  }

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:invite.title')}
          description={t('admin:invite.desc')}
          action={
            <AdminButton type="button" onClick={openCreate}>
              <ProIconAdminUsers size={16} className="mr-1.5" />
              {t('admin:invite.createBtn')}
            </AdminButton>
          }
        />
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center font-mono text-sm text-muted-foreground">
            {t('admin:invite.empty')}
          </p>
        ) : (
          <PixelTable columns={columns} data={list} rowKey="id" emptyText={t('admin:invite.empty')} />
        )}
      </AdminDataPanel>

      <AppModalShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        size="form"
        className="max-h-[90vh]"
        title={editing ? t('admin:invite.editTitle') : t('admin:invite.createTitle')}
        description={t('admin:invite.formDesc')}
      >
        <div className="grid gap-4 py-2">
          {!editing ? (
            <div className="grid gap-2">
              <label htmlFor="invite-code" className="text-sm font-medium">
                {t('admin:invite.formCode')}
              </label>
              <Input
                id="invite-code"
                value={form.code ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder={t('admin:invite.formCodePlaceholder')}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t('admin:invite.formCode')}</span>
              <PixelCellMono>{editing.code}</PixelCellMono>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="invite-max-uses" className="text-sm font-medium">
                {t('admin:invite.formMaxUses')}
              </label>
              <Input
                id="invite-max-uses"
                type="number"
                min={0}
                value={form.maxUses ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">{t('admin:invite.formMaxUsesHint')}</p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="invite-expires" className="text-sm font-medium">
                {t('admin:invite.formExpires')}
              </label>
              <Input
                id="invite-expires"
                type="datetime-local"
                value={toDatetimeLocalValue(form.expiresAt ?? null)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiresAt: fromDatetimeLocalValue(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="invite-reward-type" className="text-sm font-medium">
              {t('admin:invite.formRewardType')}
            </label>
            <select
              id="invite-reward-type"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.rewardType ?? 'none'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  rewardType: e.target.value as InviteRewardType,
                  rewardPayload: e.target.value === 'none' ? null : f.rewardPayload ?? {},
                }))
              }
            >
              {REWARD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {rewardLabel(type)}
                </option>
              ))}
            </select>
          </div>
          {form.rewardType === 'quota_bonus' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="invite-token-bonus" className="text-sm font-medium">
                  {t('admin:invite.formTokenBonus')}
                </label>
                <Input
                  id="invite-token-bonus"
                  type="number"
                  min={0}
                  value={form.rewardPayload?.tokenBonus ?? ''}
                  onChange={(e) =>
                    updateRewardPayload({
                      tokenBonus: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="invite-run-bonus" className="text-sm font-medium">
                  {t('admin:invite.formRunBonus')}
                </label>
                <Input
                  id="invite-run-bonus"
                  type="number"
                  min={0}
                  value={form.rewardPayload?.runBonus ?? ''}
                  onChange={(e) =>
                    updateRewardPayload({
                      runBonus: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          ) : null}
          {form.rewardType === 'plan_trial' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="invite-plan-code" className="text-sm font-medium">
                  {t('admin:invite.formPlanCode')}
                </label>
                <select
                  id="invite-plan-code"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.rewardPayload?.planCode ?? ''}
                  onChange={(e) => updateRewardPayload({ planCode: e.target.value || null })}
                >
                  <option value="">{t('admin:invite.formPlanPlaceholder')}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name} ({plan.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="invite-trial-days" className="text-sm font-medium">
                  {t('admin:invite.formTrialDays')}
                </label>
                <Input
                  id="invite-trial-days"
                  type="number"
                  min={1}
                  value={form.rewardPayload?.days ?? ''}
                  onChange={(e) =>
                    updateRewardPayload({
                      days: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <AdminButtonOutline type="button" onClick={() => setDialogOpen(false)}>
            {t('admin:invite.cancel')}
          </AdminButtonOutline>
          <AdminButton type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? t('admin:invite.saving') : t('admin:invite.save')}
          </AdminButton>
        </DialogFooter>
      </AppModalShell>
    </AdminDataPage>
  )
}
