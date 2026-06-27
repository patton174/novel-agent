import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  AdminButtonOutline,
  AdminFormChip,
  AdminFormStack,
  AdminField,
  AdminStatusBadge,
  adminFormRowClass,
} from '@/components/admin/AdminFormControls'
import {
  PixelCellMono,
  PixelCellStack,
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
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

  const planColumns = useMemo((): PixelColumn<AdminPlan>[] => {
    return [
      {
        key: 'plan',
        header: t('admin:plans.colPlan'),
        render: (plan) => (
          <PixelCellStack
            title={
              <>
                {plan.name}
                {plan.isFeatured ? <span className="ml-1 text-amber-600">★</span> : null}
              </>
            }
            subtitle={plan.code}
          />
        ),
      },
      {
        key: 'price',
        header: t('admin:plans.colPrice'),
        render: (plan) => <PixelCellMono>{formatPlanPrice(plan.priceCents)}</PixelCellMono>,
      },
      {
        key: 'quota',
        header: `${t('admin:plans.colTokenQuota')} / ${t('admin:plans.colRunQuota')} / ${t('admin:plans.colRpm')}`,
        render: (plan) => (
          <PixelCellText muted>
            {formatTokenQuota(plan.monthlyTokenQuota)} /{' '}
            {plan.monthlyRunQuota == null ? t('admin:common.unlimitedSymbol') : plan.monthlyRunQuota} / {plan.rateLimitRpm}
          </PixelCellText>
        ),
      },
      {
        key: 'payReady',
        header: t('admin:plans.colPayReady'),
        render: (plan) =>
          plan.priceCents != null && plan.priceCents > 0 ? (
            <AdminStatusBadge tone={plan.paymentReady ? 'success' : 'warning'}>
              {plan.paymentReady ? t('admin:plans.paymentReady') : t('admin:plans.paymentNotReady')}
            </AdminStatusBadge>
          ) : (
            '—'
          ),
      },
      {
        key: 'orderStats',
        header: t('admin:plans.orderStats'),
        render: (plan) => (
          <PixelCellMono>
            {t('admin:plans.orderStatsSummary', {
              paid: plan.orderStats.paid,
              pending: plan.orderStats.pending,
              total: plan.orderStats.total,
            })}
          </PixelCellMono>
        ),
      },
      {
        key: 'status',
        header: t('admin:plans.colStatus'),
        render: (plan) => (
          <AdminStatusBadge tone={plan.isActive ? 'success' : 'neutral'}>
            {plan.isActive ? t('admin:plans.statusActive') : t('admin:plans.statusInactive')}
          </AdminStatusBadge>
        ),
      },
      {
        key: 'actions',
        header: t('admin:plans.colActions'),
        className: 'min-w-[280px]',
        render: (plan) => (
          <PixelTableActionBar>
            <PixelTableActionButton onClick={() => void openPlanDetail(plan)}>
              {t('admin:plans.viewDetail')}
            </PixelTableActionButton>
            <PixelTableActionButton onClick={() => openEdit(plan)}>
              {t('admin:plans.edit')}
            </PixelTableActionButton>
            {plan.isActive ? (
              <PixelTableActionButton
                variant="danger"
                onClick={() => void handleDeactivate(plan)}
              >
                {t('admin:plans.deactivateBtn')}
              </PixelTableActionButton>
            ) : (
              <PixelTableActionButton onClick={() => void handleActivate(plan)}>
                {t('admin:plans.activateBtn')}
              </PixelTableActionButton>
            )}
            <PixelTableActionButton asChild>
              <Link to={`/admin/billing/orders?planId=${plan.id}`}>{t('admin:plans.viewOrders')}</Link>
            </PixelTableActionButton>
          </PixelTableActionBar>
        ),
      },
    ]
  }, [handleActivate, handleDeactivate, openEdit, openPlanDetail, t])

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
          <p className="px-4 py-10 text-center font-mono text-sm text-muted-foreground">{t('admin:plans.empty')}</p>
        ) : (
          <PixelTable
            columns={planColumns}
            data={list}
            rowKey="id"
            emptyText={t('admin:plans.empty')}
          />
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
          <AdminFormStack>
            <AdminField layout="form" label={t('admin:plans.formCode')} htmlFor="plan-code">
              <Input
                id="plan-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                disabled={Boolean(editing)}
              />
            </AdminField>
            <AdminField layout="form" label={t('admin:plans.formName')} htmlFor="plan-name">
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </AdminField>
            <div className={adminFormRowClass}>
              <AdminField layout="form" label={t('admin:plans.formPrice')} htmlFor="plan-price">
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
              </AdminField>
              <AdminField layout="form" label={t('admin:plans.formSort')} htmlFor="plan-sort">
                <Input
                  id="plan-sort"
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </AdminField>
            </div>
            <div className={adminFormRowClass}>
              <AdminField layout="form" label={t('admin:plans.formTokenQuota')} htmlFor="plan-tokens">
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
              </AdminField>
              <AdminField layout="form" label={t('admin:plans.formRunQuota')} htmlFor="plan-runs">
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
              </AdminField>
            </div>
            <AdminField layout="form" label={t('admin:plans.formFeatures')}>
              <div className="flex flex-wrap gap-2">
                {PLAN_FEATURE_OPTIONS.map((opt) => {
                  const checked = (form.features ?? []).includes(opt.key)
                  return (
                    <AdminFormChip
                      key={opt.key}
                      selected={checked}
                      onClick={() => toggleFeature(opt.key)}
                    >
                      {opt.label}
                    </AdminFormChip>
                  )
                })}
              </div>
            </AdminField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.isFeatured)}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
              {t('admin:plans.formFeatured')}
            </label>
            <IdrProjectSkuPicker
              projectId={form.idrProjectId}
              skuId={form.idrSkuId}
              onProjectChange={(pid) => setForm((f) => ({ ...f, idrProjectId: pid, idrSkuId: null }))}
              onSkuChange={(sid) => setForm((f) => ({ ...f, idrSkuId: sid }))}
            />
            <p className="text-xs text-muted-foreground">{t('admin:plans.formIdrSkuHint')}</p>
          </AdminFormStack>

          <DialogFooter className="gap-2 sm:gap-2 sm:items-center">
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
