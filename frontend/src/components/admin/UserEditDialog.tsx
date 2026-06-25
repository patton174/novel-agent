import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
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
  type AdminUserUsage,
} from '@/api/billingAdminApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { AdminButton, AdminButtonOutline } from '@/components/admin/AdminFormControls'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
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
  const { t } = useTranslation(['admin'])
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
              {user.username}（{user.email}）
              <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                userId: {user.id}
              </span>
            </>
          ) : undefined
        }
      >
        <div className="flex gap-2 border-b border-border pb-2">
          {(
            [
              { key: 'account', label: t('admin:userEdit.tabAccount') },
              { key: 'billing', label: t('admin:userEdit.tabBilling') },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === item.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'account' ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin:userEdit.roleLabel')}</label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin:userEdit.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:userEdit.currentPlan')}</label>
                  <Select value={planCode} onValueChange={setPlanCode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void handleSaveSubscription()}
                  >
                    {t('admin:userEdit.savePlan')}
                  </Button>
                </div>

                <div className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">{usage.planName} · {usage.periodYyyyMm}</p>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <p>
                      Tokens: {formatTokenQuota(usage.tokensUsed)} /{' '}
                      {formatTokenQuota(usage.tokenQuota)}（{usage.percentUsed.toFixed(1)}%）
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${tokenPercent}%` }}
                      />
                    </div>
                    <p>
                      Runs: {usage.runsUsed}
                      {usage.runQuota != null ? ` / ${usage.runQuota}` : ` / ${t('admin:userEdit.unlimited')}`}
                    </p>
                    <p>{t('admin:userEdit.estCost')}: {formatCostMicros(usage.costMicros)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="mt-2 h-auto p-0"
                    onClick={() => setEventsOpen(true)}
                  >
                    {t('admin:userEdit.viewDetails', { count: usage.recentEvents.length })}
                  </Button>
                </div>

                {usage.activeOverrides.length > 0 ? (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">{t('admin:userEdit.activeOverrides')}</p>
                    {usage.activeOverrides.map((o) => (
                      <p key={o.id}>
                        +{formatTokenQuota(o.tokenBonus)} tokens, +{o.runBonus} runs
                        {o.reason ? ` · ${o.reason}` : ''}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-sm font-medium">{t('admin:userEdit.addOverrideTitle')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder={t('admin:userEdit.tokenBonusPlaceholder')}
                      value={tokenBonus}
                      onChange={(e) => setTokenBonus(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder={t('admin:userEdit.runBonusPlaceholder')}
                      value={runBonus}
                      onChange={(e) => setRunBonus(e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder={t('admin:userEdit.reasonPlaceholder')}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void handleAddOverride()}
                  >
                    {t('admin:userEdit.addOverrideBtn')}
                  </Button>
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
          <ul className="mt-4 divide-y divide-border text-sm">
            {(usage?.recentEvents ?? []).map((ev) => (
              <li key={ev.id} className="py-3">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{ev.eventType}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {ev.totalTokens.toLocaleString('zh-CN')} tok
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ev.model ?? '—'} · {new Date(ev.createdAt).toLocaleString('zh-CN')}
                </p>
                {ev.runId ? (
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    run:{ev.runId}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}
