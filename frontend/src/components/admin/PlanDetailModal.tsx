import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  formatOrderAmount,
  type AdminPlanDetail,
  type AdminPaymentOrder,
} from '@/api/billingAdminApi'
import { AppSheetModal } from '@/components/ui/AppSheetModal'
import { TableActionButton } from '@/components/shared/TableActions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlanDetailModalProps {
  detail: AdminPlanDetail | null
  loading: boolean
  onClose: () => void
  onOpenOrder: (order: AdminPaymentOrder) => void
}

export function PlanDetailModal({ detail, loading, onClose, onOpenOrder }: PlanDetailModalProps) {
  const { t } = useTranslation(['admin'])
  const plan = detail?.plan

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
          <div className="flex flex-wrap gap-2">
            <StatusPill active={plan.isActive} label={plan.isActive ? t('admin:plans.statusActive') : t('admin:plans.statusInactive')} />
            {plan.priceCents != null && plan.priceCents > 0 ? (
              <StatusPill
                active={plan.paymentReady}
                label={plan.paymentReady ? t('admin:plans.paymentReady') : t('admin:plans.paymentNotReady')}
              />
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t('admin:plans.statsTotal')} value={plan.orderStats.total} />
            <Stat label={t('admin:plans.statsPending')} value={plan.orderStats.pending} />
            <Stat label={t('admin:plans.statsPaid')} value={plan.orderStats.paid} />
            <Stat label={t('admin:plans.statsExpired')} value={plan.orderStats.expired} />
          </dl>

          {(plan.idrSkuId || plan.idrProjectId) && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
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

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/admin/payment-orders?planId=${plan.id}`}>{t('admin:plans.viewOrders')}</Link>
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('admin:plans.recentOrders')}
            </p>
            {detail.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin:plans.noOrders')}</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {detail.recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs">#{order.id}</p>
                      <p className="truncate text-xs text-muted-foreground">{order.idrOrderId}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular-nums">{formatOrderAmount(order.amountCents, order.currency)}</span>
                      <span className="font-mono text-[10px] uppercase">{order.status}</span>
                      <TableActionButton onClick={() => onOpenOrder(order)}>
                        {t('admin:paymentOrders.viewDetail')}
                      </TableActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </AppSheetModal>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  )
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase',
        active ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900',
      )}
    >
      {label}
    </span>
  )
}
