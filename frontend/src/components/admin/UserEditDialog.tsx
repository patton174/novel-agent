import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminUser } from '@/api/adminApi'
import { updateUser } from '@/api/adminApi'
import {
  addUserQuotaOverride,
  fetchAdminPlans,
  fetchAdminUserUsage,
  formatCostMicros,
  formatTokenQuota,
  updateUserSubscription,
  type AdminPlan,
  type AdminUsageEvent,
  type AdminUserUsage,
} from '@/api/billingAdminApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import {
  AdminButton,
  AdminButtonOutline,
  AdminControlRow,
  AdminField,
  AdminSelect,
  AdminTabList,
  AdminTabTrigger,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import {
  PixelCellMono,
  PixelCellStack,
  PIXEL_PANEL,
  PixelTable,
  PixelTableActionButton,
  type PixelColumn,
} from '@/components/pixel'
import { DialogFooter } from '@/components/ui/dialog'
import { adminFormatLocale } from '@/components/admin/adminUiTokens'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { appToast } from '@/stores/appToastStore'
import type { UserRole } from '@/stores/userStore'

type TabKey = 'account' | 'billing'

interface UserEditDialogProps {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (user: AdminUser) => void
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: UserEditDialogProps) {
  const { t, i18n } = useTranslation(['admin'])
  const [tab, setTab] = useState<TabKey>('account')
  const [role, setRole] = useState<UserRole>('user')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const ROLES: { value: UserRole; label: string }[] = [
    { value: 'user', label: t('admin:users.roleUser') },
    { value: 'vip', label: t('admin:users.roleVip') },
    { value: 'admin', label: t('admin:users.roleAdmin') },
  ]

  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [usage, setUsage] = useState<AdminUserUsage | null>(null)
  const [planCode, setPlanCode] = useState('hobby')
  const [billingLoading, setBillingLoading] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)

  const [tokenBonus, setTokenBonus] = useState('0')
  const [runBonus, setRunBonus] = useState('0')
  const [overrideReason, setOverrideReason] = useState('')

  const loadBilling = useCallback(async (userId: string) => {
    setBillingLoading(true)
    try {
      const [planList, usageData] = await Promise.all([
        fetchAdminPlans(),
        fetchAdminUserUsage(userId),
      ])
      setPlans(planList.filter((p) => p.isActive))
      setUsage(usageData)
      setPlanCode(usageData.planCode)
    } catch (err) {
      setUsage(null)
      appToast.error(err instanceof Error ? err.message : t('admin:userEdit.loadBillingFail'))
    } finally {
      setBillingLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setIsActive(user.isActive)
      setTab('account')
    }
  }, [user])

  useEffect(() => {
    if (open && user && tab === 'billing') {
      void loadBilling(user.id)
    }
  }, [open, user, tab, loadBilling])

  const handleSaveAccount = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updated = await updateUser(user.id, { role, isActive })
      onSaved(updated)
      onOpenChange(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:userEdit.updateUserFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSubscription = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateUserSubscription(user.id, planCode, 'admin update')
      await loadBilling(user.id)
      appToast.success(t('admin:userEdit.subUpdated'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:userEdit.updateSubFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleAddOverride = async () => {
    if (!user) return
    setSaving(true)
    try {
      await addUserQuotaOverride(user.id, {
        tokenBonus: Number(tokenBonus) || 0,
        runBonus: Number(runBonus) || 0,
        reason: overrideReason.trim() || undefined,
      })
      setTokenBonus('0')
      setRunBonus('0')
      setOverrideReason('')
      await loadBilling(user.id)
      appToast.success(t('admin:userEdit.quotaAdded'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:userEdit.addQuotaFail'))
    } finally {
      setSaving(false)
    }
  }

  const tokenPercent =
    usage?.tokenQuota && usage.tokenQuota > 0
      ? Math.min(100, (usage.tokensUsed / usage.tokenQuota) * 100)
      : 0

  const eventColumns = useMemo((): PixelColumn<AdminUsageEvent>[] => {
    return [
      {
        key: 'type',
        header: t('admin:userEdit.colEvent'),
        render: (ev) => <PixelCellStack title={ev.eventType} subtitle={ev.model ?? '—'} />,
      },
      {
        key: 'tokens',
        header: t('admin:userEdit.colTokens'),
        align: 'right',
        render: (ev) => (
          <PixelCellMono>{ev.totalTokens.toLocaleString(adminFormatLocale(i18n.language))}</PixelCellMono>
        ),
      },
      {
        key: 'time',
        header: t('admin:auditLog.colTime'),
        render: (ev) => (
          <PixelCellMono className="whitespace-nowrap text-muted-foreground">
            {new Date(ev.createdAt).toLocaleString(adminFormatLocale(i18n.language))}
          </PixelCellMono>
        ),
      },
      {
        key: 'run',
        header: t('admin:userEdit.colRunId'),
        render: (ev) =>
          ev.runId ? (
            <PixelCellMono className="max-w-[120px] truncate">
              <span title={ev.runId}>{ev.runId}</span>
            </PixelCellMono>
          ) : (
            t('admin:jobs.duration.dash')
          ),
      },
    ]
  }, [i18n.language, t])

  return (
    <>
      <AppModalShell
        open={open}
        onOpenChange={onOpenChange}
        size="form"
        className="max-h-[90vh]"
        title={t('admin:userEdit.title')}
        description={
          user ? (
            <>
              {t('admin:userEdit.userDescription', { username: user.username, email: user.email })}
              <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                {t('admin:userEdit.userIdLabel', { id: user.id })}
              </span>
            </>
          ) : undefined
        }
      >
        <AdminTabList className="border-b-2 border-foreground/15 pb-2">
          {(
            [
              { key: 'account', label: t('admin:userEdit.tabAccount') },
              { key: 'billing', label: t('admin:userEdit.tabBilling') },
            ] as const
          ).map((item) => (
            <AdminTabTrigger
              key={item.key}
              type="button"
              active={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </AdminTabTrigger>
          ))}
        </AdminTabList>

        {tab === 'account' ? (
          <div className="space-y-4 py-2">
            <AdminField layout="form" label={t('admin:userEdit.roleLabel')}>
              <AdminSelect value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t('admin:userEdit.statusLabel')}</p>
                <p className="text-xs text-muted-foreground">{t('admin:userEdit.statusDesc')}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {billingLoading ? (
              <p className="text-sm text-muted-foreground">{t('admin:userEdit.loadingBilling')}</p>
            ) : usage ? (
              <>
                <AdminControlRow className="items-end">
                  <AdminField layout="form" label={t('admin:userEdit.currentPlan')} className="min-w-0 flex-1">
                    <AdminSelect value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                      {plans.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                  <AdminButtonOutline disabled={saving} onClick={() => void handleSaveSubscription()}>
                    {t('admin:userEdit.savePlan')}
                  </AdminButtonOutline>
                </AdminControlRow>

                <div className={cn(PIXEL_PANEL, 'text-sm')}>
                  <p className="font-medium">{usage.planName} · {usage.periodYyyyMm}</p>
                  <div className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
                    <p>
                      {t('admin:userEdit.usageTokensLine', {
                        used: formatTokenQuota(usage.tokensUsed),
                        quota: formatTokenQuota(usage.tokenQuota),
                        percent: usage.percentUsed.toFixed(1),
                      })}
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${tokenPercent}%` }}
                      />
                    </div>
                    <p>
                      {t('admin:userEdit.usageRunsLine', {
                        used: usage.runsUsed,
                        quotaSuffix:
                          usage.runQuota != null
                            ? ` / ${usage.runQuota}`
                            : ` / ${t('admin:userEdit.unlimited')}`,
                      })}
                    </p>
                    <p>{t('admin:userEdit.estCost')}: {formatCostMicros(usage.costMicros)}</p>
                  </div>
                  <PixelTableActionButton className="mt-2" variant="ghost" onClick={() => setEventsOpen(true)}>
                    {t('admin:userEdit.viewDetails', { count: usage.recentEvents.length })}
                  </PixelTableActionButton>
                </div>

                {usage.activeOverrides.length > 0 ? (
                  <div className={cn(PIXEL_PANEL, 'border-dashed font-mono text-xs text-muted-foreground')}>
                    <p className="mb-1 font-bold uppercase tracking-wide text-foreground">
                      {t('admin:userEdit.activeOverrides')}
                    </p>
                    {usage.activeOverrides.map((o) => (
                      <p key={o.id} className="border-b border-foreground/10 py-1 last:border-0">
                        +{formatTokenQuota(o.tokenBonus)} tokens, +{o.runBonus} runs
                        {o.reason ? ` · ${o.reason}` : ''}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div className={cn(PIXEL_PANEL, 'space-y-2 border-dashed')}>
                  <p className="text-sm font-medium">{t('admin:userEdit.addOverrideTitle')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <AdminTextInput
                      type="number"
                      placeholder={t('admin:userEdit.tokenBonusPlaceholder')}
                      value={tokenBonus}
                      onChange={(e) => setTokenBonus(e.target.value)}
                    />
                    <AdminTextInput
                      type="number"
                      placeholder={t('admin:userEdit.runBonusPlaceholder')}
                      value={runBonus}
                      onChange={(e) => setRunBonus(e.target.value)}
                    />
                  </div>
                  <AdminTextInput
                    placeholder={t('admin:userEdit.reasonPlaceholder')}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                  <AdminControlRow className="items-end">
                    <AdminButtonOutline disabled={saving} onClick={() => void handleAddOverride()}>
                      {t('admin:userEdit.addOverrideBtn')}
                    </AdminButtonOutline>
                  </AdminControlRow>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('admin:userEdit.noBillingData')}</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <AdminButtonOutline onClick={() => onOpenChange(false)} disabled={saving}>
            {t('admin:userEdit.close')}
          </AdminButtonOutline>
          {tab === 'account' ? (
            <AdminButton onClick={() => void handleSaveAccount()} disabled={saving || !user}>
              {saving ? t('admin:userEdit.saving') : t('admin:userEdit.saveAccount')}
            </AdminButton>
          ) : null}
        </DialogFooter>
      </AppModalShell>

      <Sheet open={eventsOpen} onOpenChange={setEventsOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('admin:userEdit.detailsTitle')}</SheetTitle>
            <SheetDescription>
              {t('admin:userEdit.detailsDesc', { username: user?.username, count: usage?.recentEvents.length ?? 0 })}
            </SheetDescription>
          </SheetHeader>
          <PixelTable
            columns={eventColumns}
            data={usage?.recentEvents ?? []}
            rowKey="id"
            compact
            emptyText={t('admin:userEdit.noEvents')}
            className="mt-4"
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
