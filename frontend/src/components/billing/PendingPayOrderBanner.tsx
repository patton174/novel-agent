import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchPendingPayOrder, type PayPendingOrder } from '@/api/billingApi'
import { formatPayPrice } from '@/components/billing/usePayCheckout'
import { Button } from '@/components/ui/button'
import { APP_BTN_MD } from '@/lib/appButtonTokens'

export function PendingPayOrderBanner() {
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
    <div className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 dark:border-amber-700/60 dark:bg-amber-950/40">
      <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
        {t('dashboard:billing.pendingOrderTitle')}
      </p>
      <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/80">
        {t('dashboard:billing.pendingOrderDesc', {
          plan: pending.planName,
          amount: formatPayPrice(pending.amountCents, pending.currency),
        })}
      </p>
      <Button className={`mt-3 ${APP_BTN_MD}`} size="sm" asChild>
        <Link to={checkoutHref}>{t('dashboard:billing.pendingOrderContinue')}</Link>
      </Button>
    </div>
  )
}
