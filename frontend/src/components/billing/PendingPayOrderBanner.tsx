import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchPendingPayOrder, type PayPendingOrder } from '@/api/billingApi'
import { formatPayPrice } from '@/components/billing/usePayCheckout'
import { Button } from '@/components/ui/button'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'

export function PendingPayOrderBanner({ layout = 'stack' }: { layout?: 'stack' | 'row' }) {
  const { t } = useTranslation(['dashboard'])
  const [pending, setPending] = useState<PayPendingOrder | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchPendingPayOrder()
      .then((data) => {
        if (!cancelled) setPending(data)
      })
      .catch(() => {
        if (!cancelled) setPending(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!pending) {
    return null
  }

  const checkoutHref = `/checkout?order=${encodeURIComponent(pending.orderId)}&plan=${encodeURIComponent(pending.planCode)}`

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-black bg-amber-50 px-5 py-4 shadow-soft dark:bg-amber-950/40',
        layout === 'row' && 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
      )}
    >
      <div className="min-w-0">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber-900 dark:text-amber-100">
          {t('dashboard:billing.pendingOrderTitle')}
        </p>
        <p className="mt-1.5 text-sm text-amber-950/90 dark:text-amber-100/85">
          {t('dashboard:billing.pendingOrderDesc', {
            plan: pending.planName,
            amount: formatPayPrice(pending.amountCents, pending.currency),
          })}
        </p>
      </div>
      <Button className={cn('shrink-0', APP_BTN_MD)} asChild>
        <Link to={checkoutHref}>{t('dashboard:billing.pendingOrderContinue')}</Link>
      </Button>
    </div>
  )
}
