import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Pencil, Plus, Star } from 'lucide-react'
import {
  createAdminPlan,
  deactivateAdminPlan,
  fetchAdminPlans,
  formatPlanPrice,
  formatTokenQuota,
  PLAN_FEATURE_OPTIONS,
  updateAdminPlan,
  type AdminPlan,
  type AdminPlanUpsertPayload,
} from '@/api/billingAdminApi'
import { Badge } from '@/components/ui/badge'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/layout/ResponsiveTable'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { cn } from '@/lib/utils'

const emptyForm = (): AdminPlanUpsertPayload => ({
  code: '',
  name: '',
  description: '',
  priceCents: 0,
  currency: 'CNY',
  monthlyTokenQuota: 10000,
  monthlyRunQuota: 50,
  rateLimitRpm: 60,
  isFeatured: false,
  sortOrder: 1,
  features: ['basic_editor'],
})

export default function PlansPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [plans, setPlans] = useState<AdminPlan[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminPlan | null>(null)
  const [form, setForm] = useState<AdminPlanUpsertPayload>(emptyForm())
  const [saving, setSaving] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      setPlans(await fetchAdminPlans())
    } catch (err) {
      setPlans([])
      appToast.error(err instanceof Error ? err.message : t('admin:plans.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (plan: AdminPlan) => {
    setEditing(plan)
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      currency: plan.currency,
      monthlyTokenQuota: plan.monthlyTokenQuota,
      monthlyRunQuota: plan.monthlyRunQuota,
      rateLimitRpm: plan.rateLimitRpm,
      isFeatured: plan.isFeatured,
      sortOrder: plan.sortOrder,
      features: [...plan.features],
    })
    setDialogOpen(true)
  }

  const toggleFeature = (key: string) => {
    setForm((prev) => {
      const features = prev.features ?? []
      const next = features.includes(key)
        ? features.filter((f) => f !== key)
        : [...features, key]
      return { ...prev, features: next }
    })
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      appToast.error(t('admin:plans.fillRequired'))
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateAdminPlan(editing.id, form)
        appToast.success(t('admin:plans.updated'))
      } else {
        await createAdminPlan(form)
        appToast.success(t('admin:plans.created'))
      }
      await loadPlans()
      setDialogOpen(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:plans.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (plan: AdminPlan) => {
    if (
      !(await confirmAction({
        title: t('admin:plans.deactivateTitle'),
        description: t('admin:plans.deactivateDesc', { name: plan.name }),
        confirmLabel: t('admin:plans.deactivateBtn'),
        danger: true,
      }))
    ) {
      return
    }
    try {
      await deactivateAdminPlan(plan.id)
      await loadPlans()
      appToast.success(t('admin:plans.deactivated'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:plans.deactivateFail'))
    }
  }

  const list = plans ?? []
  const columns: ResponsiveTableColumn<AdminPlan>[] = [
    {
      key: 'plan',
      header: t('admin:plans.colPlan'),
      cellClassName: 'px-4 py-3',
      renderCell: (plan) => (
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2 font-medium">
              {plan.name}
              {plan.isFeatured ? (
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
              ) : null}
            </div>
            <div className="font-mono text-xs text-muted-foreground">{plan.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: t('admin:plans.colPrice'),
      cellClassName: 'px-4 py-3 tabular-nums',
      renderCell: (plan) => formatPlanPrice(plan.priceCents),
    },
    {
      key: 'tokenQuota',
      header: t('admin:plans.colTokenQuota'),
      cellClassName: 'px-4 py-3 tabular-nums',
      renderCell: (plan) => formatTokenQuota(plan.monthlyTokenQuota),
    },
    {
      key: 'runQuota',
      header: t('admin:plans.colRunQuota'),
      cellClassName: 'px-4 py-3 tabular-nums',
      renderCell: (plan) => (plan.monthlyRunQuota == null ? t('admin:plans.unlimited') : plan.monthlyRunQuota),
    },
    {
      key: 'rpm',
      header: t('admin:plans.colRpm'),
      cellClassName: 'px-4 py-3 tabular-nums',
      renderCell: (plan) => plan.rateLimitRpm,
    },
    {
      key: 'status',
      header: t('admin:plans.colStatus'),
      cellClassName: 'px-4 py-3',
      renderCell: (plan) => (
        <Badge variant={plan.isActive ? 'secondary' : 'outline'}>
          {plan.isActive ? t('admin:plans.statusActive') : t('admin:plans.statusInactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('admin:plans.colActions'),
      headerClassName: 'px-4 py-3 font-medium text-right',
      cellClassName: 'px-4 py-3 text-right',
      renderCell: (plan) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(plan)}>
            <Pencil className="mr-1 size-3.5" />
            {t('admin:plans.edit')}
          </Button>
          {plan.isActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => void handleDeactivate(plan)}
            >
              {t('admin:plans.deactivateBtn')}
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <AppPageStack>
        <AppShellCard>
          <AppShellCardHeader title={t('admin:plans.title')} description={t('admin:plans.loading')} />
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        </AppShellCard>
      </AppPageStack>
    )
  }

  return (
    <AppPageStack>
      <AppShellCard>
        <AppShellCardHeader
          title={t('admin:plans.title')}
          description={t('admin:plans.desc')}
          action={
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t('admin:plans.createBtn')}
            </Button>
          }
        />
        <ResponsiveTable
          columns={columns}
          rows={list}
          loading={false}
          getRowKey={(plan) => plan.id}
          wrapDesktopInCard={false}
          tableClassName="w-full min-w-[880px] text-sm"
          tableHeaderClassName="bg-muted/40 text-left text-xs text-muted-foreground"
          tableBodyClassName="divide-y divide-border"
          renderMobileCard={(plan) => (
            <article className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    {plan.name}
                    {plan.isFeatured ? (
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    ) : null}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{plan.code}</p>
                </div>
                <Badge variant={plan.isActive ? 'secondary' : 'outline'}>
                  {plan.isActive ? t('admin:plans.statusActive') : t('admin:plans.statusInactive')}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">{t('admin:plans.colPrice')}</dt>
                  <dd className="tabular-nums font-medium">{formatPlanPrice(plan.priceCents)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Token</dt>
                  <dd className="tabular-nums">{formatTokenQuota(plan.monthlyTokenQuota)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Run</dt>
                  <dd className="tabular-nums">
                    {plan.monthlyRunQuota == null ? t('admin:plans.unlimited') : plan.monthlyRunQuota}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">RPM</dt>
                  <dd className="tabular-nums">{plan.rateLimitRpm}</dd>
                </div>
              </dl>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                  <Pencil className="mr-1 size-3.5" />
                  {t('admin:plans.edit')}
                </Button>
                {plan.isActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void handleDeactivate(plan)}
                  >
                    {t('admin:plans.deactivateBtn')}
                  </Button>
                ) : null}
              </div>
            </article>
          )}
          mobileListClassName="px-4 pb-4"
          renderMobileEmpty={<p className="py-6 text-center text-sm text-muted-foreground">{t('admin:plans.empty')}</p>}
          renderDesktopEmpty={<p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('admin:plans.empty')}</p>}
        />
      </AppShellCard>

      <AppModalShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        size="form"
        className="max-h-[90vh]"
        title={editing ? t('admin:plans.editTitle') : t('admin:plans.createTitle')}
        description={t('admin:plans.formDesc')}
      >
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="plan-code" className="text-sm font-medium">
                Code
              </label>
              <Input
                id="plan-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                disabled={Boolean(editing)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="plan-name" className="text-sm font-medium">
                {t('admin:plans.formName')}
              </label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="plan-price" className="text-sm font-medium">
                  {t('admin:plans.formPrice')}
                </label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={
                    form.priceCents != null && form.priceCents !== 0
                      ? (form.priceCents / 100).toFixed(2)
                      : form.priceCents === 0
                        ? '0'
                        : ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      setForm((f) => ({ ...f, priceCents: 0 }))
                      return
                    }
                    const yuan = Number(raw)
                    setForm((f) => ({
                      ...f,
                      priceCents: Number.isFinite(yuan) ? Math.round(yuan * 100) : 0,
                    }))
                  }}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="plan-sort" className="text-sm font-medium">
                  {t('admin:plans.formSort')}
                </label>
                <Input
                  id="plan-sort"
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="plan-tokens" className="text-sm font-medium">
                  {t('admin:plans.formTokenQuota')}
                </label>
                <Input
                  id="plan-tokens"
                  type="number"
                  value={form.monthlyTokenQuota ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      monthlyTokenQuota: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="plan-runs" className="text-sm font-medium">
                  {t('admin:plans.formRunQuota')}
                </label>
                <Input
                  id="plan-runs"
                  type="number"
                  value={form.monthlyRunQuota ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      monthlyRunQuota: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t('admin:plans.formFeatures')}</span>
              <div className="flex flex-wrap gap-2">
                {PLAN_FEATURE_OPTIONS.map((opt) => {
                  const checked = (form.features ?? []).includes(opt.key)
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleFeature(opt.key)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.isFeatured)}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
              {t('admin:plans.formFeatured')}
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('admin:plans.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('admin:plans.saving') : t('admin:plans.save')}
            </Button>
          </DialogFooter>
      </AppModalShell>
    </AppPageStack>
  )
}
