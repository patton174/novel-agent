import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatOrderAmount,
  type AdminPlanDetail,
  type AdminPaymentOrder,
} from '@/api/billingAdminApi'
import { AdminButtonGhost, AdminStatusBadge } from '@/components/admin/AdminFormControls'
import {
  PixelBadge,
  PixelCellMono,
  PixelTable,
  PixelTableActionButton,
  type PixelColumn,
} from '@/components/pixel'
import { AppSheetModal } from '@/components/ui/AppSheetModal'

interface PlanDetailModalProps {
  detail: AdminPlanDetail | null
  loading: boolean
  onClose: () => void
  onOpenOrder: (order: AdminPaymentOrder) => void
}

export function PlanDetailModal({ detail, loading, onClose, onOpenOrder }: PlanDetailModalProps) {
  const { t } = useTranslation(['admin'])
  const plan = detail?.plan

  const orderColumns = useMemo((): PixelColumn<AdminPaymentOrder>[] => {
    return [
      {
        key: 'id',
        header: 'ID',
        render: (order) => <PixelCellMono>#{order.id}</PixelCellMono>,
      },
      {
        key: 'idr',
        header: t('admin:paymentOrders.colIdrOrder'),
        render: (order) => (
          <PixelCellMono className="max-w-[120px] truncate">{order.idrOrderId}</PixelCellMono>
        ),
      },
      {
        key: 'amount',
        header: t('admin:paymentOrders.colAmount'),
        render: (order) => (
          <PixelCellMono>{formatOrderAmount(order.amountCents, order.currency)}</PixelCellMono>
        ),
      },
      {
        key: 'status',
        header: t('admin:paymentOrders.colStatus'),
        render: (order) => (
          <AdminStatusBadge
            tone={
              order.status === 'DONE'
                ? 'success'
                : order.status === 'NEW'
                  ? 'info'
                  : order.status === 'REFUND'
                    ? 'warning'
                    : 'neutral'
            }
          >
            {order.status}
          </AdminStatusBadge>
        ),
      },
      {
        key: 'actions',
        header: t('admin:paymentOrders.colActions'),
        align: 'right',
        render: (order) => (
          <PixelTableActionButton onClick={() => onOpenOrder(order)}>
            {t('admin:paymentOrders.viewDetail')}
          </PixelTableActionButton>
        ),
      },
    ]
  }, [onOpenOrder, t])

  return (
    <AppSheetModal
      open={plan != null}
      onOpenChange={(open) => !open && onClose()}
      modalSize="reader"
      sheetSide="bottom"
      title={plan ? `${plan.name} · ${plan.code}` : undefined}
      description={plan ? t('admin:plans.detailDesc') : undefined}
      className="sm:max-w-2xl"
      bodyClassName="space-y-4 px-0 pb-2 text-sm"
    >
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">{t('admin:plans.loading')}</p>
      ) : plan ? (
        <>
          <div className="flex flex-wrap gap-2 px-4">
            <PixelBadge tone={plan.isActive ? 'success' : 'warning'}>
              {plan.isActive ? t('admin:plans.statusActive') : t('admin:plans.statusInactive')}
            </PixelBadge>
            {plan.priceCents != null && plan.priceCents > 0 ? (
              <PixelBadge tone={plan.paymentReady ? 'success' : 'warning'}>
                {plan.paymentReady ? t('admin:plans.paymentReady') : t('admin:plans.paymentNotReady')}
              </PixelBadge>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4">
            <Stat label={t('admin:plans.statsTotal')} value={plan.orderStats.total} />
            <Stat label={t('admin:plans.statsPending')} value={plan.orderStats.pending} />
            <Stat label={t('admin:plans.statsPaid')} value={plan.orderStats.paid} />
            <Stat label={t('admin:plans.statsExpired')} value={plan.orderStats.expired} />
          </dl>

          {(plan.idrSkuId || plan.idrProjectId) && (
            <div className="mx-4 border-2 border-foreground/20 bg-muted/20 px-3 py-2 font-mono text-xs">
              {plan.idrProjectId ? (
                <p>
                  <span className="text-muted-foreground">{t('admin:plans.formIdrProject')}:</span>{' '}
                  {t('admin:plans.idrBound')}
                </p>
              ) : null}
              {plan.idrSkuId ? (
                <p className={plan.idrProjectId ? 'mt-1' : undefined}>
                  <span className="text-muted-foreground">{t('admin:plans.formIdrSku')}:</span>{' '}
                  {t('admin:plans.idrBound')}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap gap-2 px-4">
            <AdminButtonGhost asChild>
              <Link to={`/admin/billing/orders?planId=${plan.id}`}>{t('admin:plans.viewOrders')}</Link>
            </AdminButtonGhost>
          </div>

          <div className="px-2">
            <p className="mb-2 px-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('admin:plans.recentOrders')}
            </p>
            <PixelTable
              columns={orderColumns}
              data={detail.recentOrders}
              rowKey="id"
              compact
              emptyText={t('admin:plans.noOrders')}
            />
          </div>
        </>
      ) : null}
    </AppSheetModal>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-foreground/15 bg-muted/10 px-3 py-2">
      <dt className="font-mono text-[10px] uppercase text-muted-foreground">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  )
}
