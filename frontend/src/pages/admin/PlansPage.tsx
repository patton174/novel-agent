import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
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
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { cn } from '@/lib/utils'
import { ProIconAdminPlan, ProIconPencil } from '@/components/pro/icons/proIcons'

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

function PlanAdminCard({
  plan,
  onEdit,
  onDeactivate,
}: {
  plan: AdminPlan
  onEdit: (plan: AdminPlan) => void
  onDeactivate: (plan: AdminPlan) => void
}) {
  const { t } = useTranslation(['admin'])

  return (
    <article className="flex flex-col border-2 border-black bg-white shadow-soft">
      <div className="flex items-start justify-between gap-3 border-b-2 border-black px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-black uppercase tracking-tight text-ink">{plan.name}</h3>
            {plan.isFeatured ? (
              <span className="shrink-0 border border-black bg-neon px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
                ★
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{plan.code}</p>
        </div>
        <span
          className={cn(
            'shrink-0 border-2 border-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide',
            plan.isActive ? 'bg-neon text-ink' : 'bg-muted text-muted-foreground',
          )}
        >
          {plan.isActive ? t('admin:plans.statusActive') : t('admin:plans.statusInactive')}
        </span>
      </div>

      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t('admin:plans.colPrice')}
          </dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-ink">{formatPlanPrice(plan.priceCents)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Token</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-ink">{formatTokenQuota(plan.monthlyTokenQuota)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Run</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-ink">
            {plan.monthlyRunQuota == null ? t('admin:plans.unlimited') : plan.monthlyRunQuota}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">RPM</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-ink">{plan.rateLimitRpm}</dd>
        </div>
      </dl>

      <div className="flex gap-2 border-t-2 border-black p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 border-2 border-black bg-white font-mono text-xs font-bold uppercase shadow-soft hover:bg-neon"
          onClick={() => onEdit(plan)}
        >
          <ProIconPencil size={14} className="mr-1.5" />
          {t('admin:plans.edit')}
        </Button>
        {plan.isActive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 border-2 border-black bg-white px-3 font-mono text-xs font-bold uppercase text-destructive shadow-soft hover:bg-destructive/10"
            onClick={() => void onDeactivate(plan)}
          >
            {t('admin:plans.deactivateBtn')}
          </Button>
        ) : null}
      </div>
    </article>
  )
}

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

  if (loading) {
    return (
      <AppPageStack>
        <AppShellCard>
          <AppShellCardHeader title={t('admin:plans.title')} description={t('admin:plans.loading')} />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full border-2 border-black" />
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full border-2 border-black bg-white font-mono text-xs font-bold uppercase shadow-soft hover:bg-neon sm:w-auto"
              onClick={openCreate}
            >
              <ProIconAdminPlan size={14} className="mr-1.5" />
              {t('admin:plans.createBtn')}
            </Button>
          }
        />
        {list.length === 0 ? (
          <p className="px-6 py-12 text-center font-mono text-sm text-muted-foreground">{t('admin:plans.empty')}</p>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {list.map((plan) => (
              <PlanAdminCard
                key={plan.id}
                plan={plan}
                onEdit={openEdit}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        )}
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
