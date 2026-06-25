import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
import {
  activateAdminPlan,
  createAdminPlan,
  deactivateAdminPlan,
  fetchAdminPlanDetail,
  fetchAdminPlans,
  fetchAdminPaymentOrderDetail,
  formatPlanPrice,
  formatTokenQuota,
  PLAN_FEATURE_OPTIONS,
  updateAdminPlan,
  type AdminPlan,
  type AdminPlanDetail,
  type AdminPlanUpsertPayload,
  type AdminPaymentOrder,
  type AdminPaymentOrderDetail,
} from '@/api/billingAdminApi'
import { PlanDetailModal } from '@/components/admin/PlanDetailModal'
import { IdrProjectSkuPicker } from '@/components/admin/IdrProjectSkuPicker'
import { PaymentOrderDetailModal } from '@/components/admin/PaymentOrderDetailModal'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import {
  AdminButton,
  AdminButtonGhost,
  AdminButtonOutline,
  AdminStatusBadge,
} from '@/components/admin/AdminFormControls'
import {
  adminTableCellClass,
  adminTableClass,
  adminTableHeadClass,
} from '@/components/admin/adminUiTokens'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
} from '@/components/layout/AdminDataLayout'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { cn } from '@/lib/utils'
import { ProIconAdminPlan } from '@/components/pro/icons/proIcons'

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
  const [planDetail, setPlanDetail] = useState<AdminPlanDetail | null>(null)
  const [planDetailLoading, setPlanDetailLoading] = useState(false)
  const [orderDetail, setOrderDetail] = useState<AdminPaymentOrderDetail | null>(null)
  const [orderDetailLoading, setOrderDetailLoading] = useState(false)

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
      idrProjectId: plan.idrProjectId,
      idrSkuId: plan.idrSkuId,
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

  const openPlanDetail = async (plan: AdminPlan) => {
    setPlanDetailLoading(true)
    setPlanDetail({ plan, paymentReady: plan.paymentReady, orderStats: plan.orderStats, recentOrders: [] })
    try {
      setPlanDetail(await fetchAdminPlanDetail(plan.id))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:plans.loadDetailFail'))
      setPlanDetail(null)
    } finally {
      setPlanDetailLoading(false)
    }
  }

  const openOrderFromPlan = async (order: AdminPaymentOrder) => {
    setOrderDetailLoading(true)
    setOrderDetail({
      ...order,
      contactInfo: '',
      callbackJson: null,
      remoteStatus: null,
      remoteSnapshot: null,
    })
    try {
      const full = await fetchAdminPaymentOrderDetail(order.id)
      setOrderDetail(full)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:paymentOrders.loadDetailFail'))
      setOrderDetail(null)
    } finally {
      setOrderDetailLoading(false)
    }
  }

  const handleActivate = async (plan: AdminPlan) => {
    try {
      await activateAdminPlan(plan.id)
      await loadPlans()
      appToast.success(t('admin:plans.activated'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:plans.activateFail'))
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
      <AdminDataPage>
        <AdminDataPanel>
          <AdminDataPanelHeader title={t('admin:plans.title')} description={t('admin:plans.loading')} />
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
          title={t('admin:plans.title')}
          description={t('admin:plans.desc')}
          action={
            <AdminButton type="button" onClick={openCreate}>
              <ProIconAdminPlan size={16} className="mr-1.5" />
              {t('admin:plans.createBtn')}
            </AdminButton>
          }
        />
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('admin:plans.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={cn(adminTableClass, 'min-w-[960px]')}>
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className={adminTableHeadClass}>{t('admin:plans.colPlan')}</th>
                  <th className={adminTableHeadClass}>{t('admin:plans.colPrice')}</th>
                  <th className={adminTableHeadClass}>Token / Run / RPM</th>
                  <th className={adminTableHeadClass}>{t('admin:plans.colPayReady')}</th>
                  <th className={adminTableHeadClass}>{t('admin:plans.orderStats')}</th>
                  <th className={adminTableHeadClass}>{t('admin:plans.colStatus')}</th>
                  <th className={adminTableHeadClass}>{t('admin:plans.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((plan) => (
                  <tr key={plan.id} className="hover:bg-muted/20">
                    <td className={adminTableCellClass}>
                      <p className="font-medium">
                        {plan.name}
                        {plan.isFeatured ? <span className="ml-1 text-amber-600">★</span> : null}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{plan.code}</p>
                    </td>
                    <td className={cn(adminTableCellClass, 'tabular-nums font-medium')}>{formatPlanPrice(plan.priceCents)}</td>
                    <td className={cn(adminTableCellClass, 'text-sm tabular-nums text-muted-foreground')}>
                      {formatTokenQuota(plan.monthlyTokenQuota)} /{' '}
                      {plan.monthlyRunQuota == null ? '∞' : plan.monthlyRunQuota} / {plan.rateLimitRpm}
                    </td>
                    <td className={adminTableCellClass}>
                      {plan.priceCents != null && plan.priceCents > 0 ? (
                        <AdminStatusBadge tone={plan.paymentReady ? 'success' : 'warning'}>
                          {plan.paymentReady ? t('admin:plans.paymentReady') : t('admin:plans.paymentNotReady')}
                        </AdminStatusBadge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={cn(adminTableCellClass, 'text-sm tabular-nums')}>
                      {t('admin:plans.orderStatsSummary', {
                        paid: plan.orderStats.paid,
                        pending: plan.orderStats.pending,
                        total: plan.orderStats.total,
                      })}
                    </td>
                    <td className={adminTableCellClass}>
                      <AdminStatusBadge tone={plan.isActive ? 'success' : 'neutral'}>
                        {plan.isActive ? t('admin:plans.statusActive') : t('admin:plans.statusInactive')}
                      </AdminStatusBadge>
                    </td>
                    <td className={adminTableCellClass}>
                      <div className="flex flex-wrap gap-1.5">
                        <AdminButtonGhost onClick={() => void openPlanDetail(plan)}>
                          {t('admin:plans.viewDetail')}
                        </AdminButtonGhost>
                        <AdminButtonGhost onClick={() => openEdit(plan)}>
                          {t('admin:plans.edit')}
                        </AdminButtonGhost>
                        {plan.isActive ? (
                          <AdminButtonGhost className="text-destructive hover:text-destructive" onClick={() => void handleDeactivate(plan)}>
                            {t('admin:plans.deactivateBtn')}
                          </AdminButtonGhost>
                        ) : (
                          <AdminButtonGhost onClick={() => void handleActivate(plan)}>
                            {t('admin:plans.activateBtn')}
                          </AdminButtonGhost>
                        )}
                        <AdminButtonGhost asChild>
                          <Link to={`/admin/payment-orders?planId=${plan.id}`}>{t('admin:plans.viewOrders')}</Link>
                        </AdminButtonGhost>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminDataPanel>

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
                        'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
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
            <div className="grid grid-cols-1 gap-3">
              <IdrProjectSkuPicker
                projectId={form.idrProjectId}
                skuId={form.idrSkuId}
                onProjectChange={(pid) => setForm((f) => ({ ...f, idrProjectId: pid, idrSkuId: null }))}
                onSkuChange={(sid) => setForm((f) => ({ ...f, idrSkuId: sid }))}
              />
              <p className="text-xs text-muted-foreground">{t('admin:plans.formIdrSkuHint')}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <AdminButtonOutline type="button" onClick={() => setDialogOpen(false)}>
              {t('admin:plans.cancel')}
            </AdminButtonOutline>
            <AdminButton type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('admin:plans.saving') : t('admin:plans.save')}
            </AdminButton>
          </DialogFooter>
      </AppModalShell>

      <PlanDetailModal
        detail={planDetail}
        loading={planDetailLoading}
        onClose={() => setPlanDetail(null)}
        onOpenOrder={(order) => void openOrderFromPlan(order)}
      />

      <PaymentOrderDetailModal
        order={orderDetail}
        loading={orderDetailLoading}
        onClose={() => setOrderDetail(null)}
        onUpdated={(updated) => {
          setOrderDetail(updated)
          void loadPlans()
          if (planDetail?.plan.id === updated.planId) {
            void openPlanDetail(planDetail.plan)
          }
        }}
      />
    </AdminDataPage>
  )
}
