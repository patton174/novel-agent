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
import {
  AdminStatusBadge,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import {
  PixelBadge,
  PixelCellMono,
  PIXEL_CODE_BLOCK,
  PIXEL_LABEL,
  PIXEL_PANEL,
  PIXEL_PANEL_SOFT,
  PixelTableActionBar,
  PixelTableActionButton,
} from '@/components/pixel'
import { AppSheetModal } from '@/components/ui/AppSheetModal'
import { adminFormatLocale } from '@/components/admin/adminUiTokens'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'

interface PaymentOrderDetailModalProps {
  order: AdminPaymentOrderDetail | null
  loading: boolean
  onClose: () => void
  onUpdated: (order: AdminPaymentOrderDetail) => void
}


export function PaymentOrderDetailModal({
  order,
  loading,
  onClose,
  onUpdated,
}: PaymentOrderDetailModalProps) {
  const { t, i18n } = useTranslation(['admin'])
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

  return (
    <AppSheetModal
      open={order != null}
      onOpenChange={(open) => !open && onClose()}
      modalSize="reader"
      sheetSide="bottom"
      title={
        order ? (
          <PixelCellMono className="text-sm">
            #{order.id} · {order.idrOrderId}
          </PixelCellMono>
        ) : undefined
      }
      description={
        order
          ? `${order.planName} · ${formatOrderAmount(order.amountCents, order.currency)} · ${t('admin:paymentOrders.userId')} ${order.userId}`
          : undefined
      }
      className="sm:max-w-2xl"
      bodyClassName="space-y-4 px-4 pb-2 text-sm"
    >
      {loading ? (
        <p className="py-8 text-center font-mono text-sm text-muted-foreground">
          {t('admin:paymentOrders.loadingDetail')}
        </p>
      ) : order ? (
        <>
          <div className={cn('grid gap-3 sm:grid-cols-2', PIXEL_PANEL_SOFT)}>
            <InfoRow label={t('admin:paymentOrders.colStatus')}>
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
              {order.remoteStatus && order.remoteStatus !== order.status ? (
                <PixelBadge tone="muted" className="ml-2">
                  {t('admin:paymentOrders.remoteStatus', { status: order.remoteStatus })}
                </PixelBadge>
              ) : null}
            </InfoRow>
            <InfoRow label={t('admin:paymentOrders.colPayMethod')}>{order.payMethod ?? t('admin:jobs.duration.dash')}</InfoRow>
            <InfoRow label={t('admin:paymentOrders.colCreated')}>
              {new Date(order.createdAt).toLocaleString(adminFormatLocale(i18n.language))}
            </InfoRow>
            <InfoRow label={t('admin:paymentOrders.colPaidAt')}>
              {order.paidAt ? new Date(order.paidAt).toLocaleString(adminFormatLocale(i18n.language)) : t('admin:jobs.duration.dash')}
            </InfoRow>
            <InfoRow label={t('admin:paymentOrders.contactInfo')}>{order.contactInfo || t('admin:jobs.duration.dash')}</InfoRow>
            <InfoRow label={t('admin:paymentOrders.colPlan')}>
              {order.planId ? (
                <Link to={`/admin/billing/orders?planId=${order.planId}`} className="text-primary hover:underline">
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
            <div className={PIXEL_PANEL}>
              <p className={PIXEL_LABEL}>{t('admin:paymentOrders.payUrl')}</p>
              <a
                href={order.payUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-xs text-primary hover:underline"
              >
                {order.payUrl}
              </a>
            </div>
          ) : null}

          <div className="grid gap-2">
            <label htmlFor="order-action-reason" className={PIXEL_LABEL}>
              {t('admin:paymentOrders.actionReason')}
            </label>
            <AdminTextInput
              id="order-action-reason"
              value={reason}
              placeholder={t('admin:paymentOrders.actionReasonHint')}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <PixelTableActionBar>
            <PixelTableActionButton
              variant="secondary"
              disabled={acting}
              onClick={() =>
                void runAction(t('admin:paymentOrders.syncBtn'), () => syncAdminPaymentOrder(order.id))
              }
            >
              {t('admin:paymentOrders.syncBtn')}
            </PixelTableActionButton>
            {order.status !== 'DONE' && order.status !== 'REFUND' ? (
              <>
                <PixelTableActionButton
                  variant="primary"
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
                </PixelTableActionButton>
                <PixelTableActionButton
                  variant="danger"
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
                </PixelTableActionButton>
              </>
            ) : null}
          </PixelTableActionBar>

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
      <p className={PIXEL_LABEL}>{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> }) {
  return (
    <div>
      <p className={cn('mb-1.5', PIXEL_LABEL)}>{label}</p>
      <pre className={cn('max-h-48', PIXEL_CODE_BLOCK)}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}
