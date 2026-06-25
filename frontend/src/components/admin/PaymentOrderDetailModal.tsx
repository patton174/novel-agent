import { Link } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  expireAdminPaymentOrder,
  fulfillAdminPaymentOrder,
  formatOrderAmount,
  syncAdminPaymentOrder,
  type AdminPaymentOrderDetail,
} from '@/api/billingAdminApi'
import { AppSheetModal } from '@/components/ui/AppSheetModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { cn } from '@/lib/utils'

interface PaymentOrderDetailModalProps {
  order: AdminPaymentOrderDetail | null
  loading: boolean
  onClose: () => void
  onUpdated: (order: AdminPaymentOrderDetail) => void
}

const STATUS_CLASS: Record<string, string> = {
  NEW: 'bg-sky-100 text-sky-900',
  DONE: 'bg-emerald-100 text-emerald-900',
  EXPIRED: 'bg-muted text-muted-foreground',
  REFUND: 'bg-amber-100 text-amber-900',
}

export function PaymentOrderDetailModal({
  order,
  loading,
  onClose,
  onUpdated,
}: PaymentOrderDetailModalProps) {
  const { t } = useTranslation(['admin'])
  const [reason, setReason] = useState('')
  const [acting, setActing] = useState(false)

  const runAction = async (
    label: string,
    action: () => Promise<AdminPaymentOrderDetail>,
    confirm?: { title: string; description: string; danger?: boolean },
  ) => {
    if (!order) return
    if (confirm) {
      const ok = await confirmAction({
        title: confirm.title,
        description: confirm.description,
        confirmLabel: label,
        danger: confirm.danger,
      })
      if (!ok) return
    }
    setActing(true)
    try {
      const updated = await action()
      onUpdated(updated)
      appToast.success(t('admin:paymentOrders.actionSuccess', { action: label }))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:paymentOrders.actionFail'))
    } finally {
      setActing(false)
    }
  }

  const statusClass = order ? (STATUS_CLASS[order.status] ?? 'bg-muted text-foreground') : ''

  return (
    <AppSheetModal
      open={order != null}
      onOpenChange={(open) => !open && onClose()}
      modalSize="reader"
      sheetSide="bottom"
      title={
        order ? (
          <span className="font-mono text-sm">
            #{order.id} · {order.idrOrderId}
          </span>
        ) : undefined
      }
      description={
        order
          ? `${order.planName} · ${formatOrderAmount(order.amountCents, order.currency)} · ${t('admin:paymentOrders.userId')} ${order.userId}`
          : undefined
      }
      className="sm:max-w-2xl"
      bodyClassName="space-y-4 px-0 pb-2 text-sm"
    >
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">{t('admin:paymentOrders.loadingDetail')}</p>
      ) : order ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label={t('admin:paymentOrders.colStatus')}>
              <span className={cn('rounded-full px-2 py-0.5 font-mono text-[11px] font-bold uppercase', statusClass)}>
                {order.status}
              </span>
              {order.remoteStatus && order.remoteStatus !== order.status ? (
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  remote: {order.remoteStatus}
                </span>
              ) : null}
            </InfoRow>
            <InfoRow label={t('admin:paymentOrders.colPayMethod')}>{order.payMethod ?? '—'}</InfoRow>
            <InfoRow label={t('admin:paymentOrders.colCreated')}>
              {new Date(order.createdAt).toLocaleString('zh-CN')}
            </InfoRow>
            <InfoRow label={t('admin:paymentOrders.colPaidAt')}>
              {order.paidAt ? new Date(order.paidAt).toLocaleString('zh-CN') : '—'}
            </InfoRow>
            <InfoRow label={t('admin:paymentOrders.contactInfo')}>{order.contactInfo}</InfoRow>
            <InfoRow label={t('admin:paymentOrders.colPlan')}>
              {order.planId ? (
                <Link to={`/admin/payment-orders?planId=${order.planId}`} className="text-primary hover:underline">
                  {order.planName}
                  <span className="ml-1 font-mono text-[11px] text-muted-foreground">{order.planCode}</span>
                </Link>
              ) : (
                <>
                  {order.planName}
                  <span className="ml-1 font-mono text-[11px] text-muted-foreground">{order.planCode}</span>
                </>
              )}
            </InfoRow>
          </div>

          {order.payUrl ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">{t('admin:paymentOrders.payUrl')}</p>
              <a href={order.payUrl} target="_blank" rel="noreferrer" className="break-all text-xs text-primary hover:underline">
                {order.payUrl}
              </a>
            </div>
          ) : null}

          <div className="grid gap-2">
            <label htmlFor="order-action-reason" className="text-xs font-medium text-muted-foreground">
              {t('admin:paymentOrders.actionReason')}
            </label>
            <Input
              id="order-action-reason"
              value={reason}
              placeholder={t('admin:paymentOrders.actionReasonHint')}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={acting}
              onClick={() =>
                void runAction(t('admin:paymentOrders.syncBtn'), () => syncAdminPaymentOrder(order.id))
              }
            >
              {t('admin:paymentOrders.syncBtn')}
            </Button>
            {order.status !== 'DONE' && order.status !== 'REFUND' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={acting}
                  onClick={() =>
                    void runAction(
                      t('admin:paymentOrders.fulfillBtn'),
                      () => fulfillAdminPaymentOrder(order.id, reason || undefined),
                      {
                        title: t('admin:paymentOrders.fulfillTitle'),
                        description: t('admin:paymentOrders.fulfillDesc'),
                      },
                    )
                  }
                >
                  {t('admin:paymentOrders.fulfillBtn')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={acting}
                  onClick={() =>
                    void runAction(
                      t('admin:paymentOrders.expireBtn'),
                      () => expireAdminPaymentOrder(order.id, reason || undefined),
                      {
                        title: t('admin:paymentOrders.expireTitle'),
                        description: t('admin:paymentOrders.expireDesc'),
                        danger: true,
                      },
                    )
                  }
                >
                  {t('admin:paymentOrders.expireBtn')}
                </Button>
              </>
            ) : null}
          </div>

          {order.callbackJson ? (
            <JsonBlock label={t('admin:paymentOrders.callbackJson')} value={order.callbackJson} />
          ) : null}
          {order.remoteSnapshot ? (
            <JsonBlock label={t('admin:paymentOrders.remoteSnapshot')} value={order.remoteSnapshot} />
          ) : null}
        </>
      ) : null}
    </AppSheetModal>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}
