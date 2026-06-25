import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PayMethodOption } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { formatPayPrice, usePayCheckout } from './usePayCheckout'

export interface PayCheckoutPanelProps {
  planCode: string | null
  enabled?: boolean
  /** inline：定价页整页下单；embedded：弹窗内 */
  layout?: 'inline' | 'embedded'
  onCancel?: () => void
  className?: string
}

export function PayCheckoutPanel({
  planCode,
  enabled = true,
  layout = 'inline',
  onCancel,
  className,
}: PayCheckoutPanelProps) {
  const { t } = useTranslation(['marketing', 'dashboard'])
  const active = enabled && Boolean(planCode)
  const { loading, paying, checkout, method, setMethod, handlePay } = usePayCheckout(
    planCode,
    active,
  )

  const isInline = layout === 'inline'
  const shellClass = isInline ? cn(MKT_SURFACE_CARD_PAD, 'space-y-6') : 'space-y-4 py-1'

  if (!planCode) {
    return null
  }

  if (loading) {
    return (
      <div className={cn(shellClass, 'flex items-center justify-center py-12', className)}>
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!checkout) {
    return (
      <div className={cn(shellClass, className)}>
        <p className="text-center text-sm text-muted-foreground">{t('dashboard:billing.payFail')}</p>
        {onCancel ? (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onCancel}>
              {t('dashboard:billing.payCancel')}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn(shellClass, className)}>
      <div className="space-y-1">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
          {t('marketing:pricing.checkout.title')}
        </h3>
        <p className="text-sm text-muted-foreground">{t('marketing:pricing.checkout.subtitle')}</p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('marketing:pricing.checkout.summary')}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">{checkout.planName}</p>
          </div>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {formatPayPrice(checkout.amountCents, checkout.currency)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">
          {t('marketing:pricing.checkout.selectMethod')}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {checkout.payments.map((p: PayMethodOption) => (
            <button
              key={p.method}
              type="button"
              onClick={() => setMethod(p.method)}
              className={cn(
                'rounded-xl border-2 px-4 py-3 text-left transition-colors',
                isInline
                  ? 'border-foreground shadow-[2px_2px_0_0_var(--foreground)]'
                  : 'border-border shadow-xs',
                method === p.method
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'bg-background hover:bg-muted/50',
              )}
            >
              <span className="block text-sm font-semibold">{p.name || p.method}</span>
              {p.desc ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{p.desc}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {checkout.alipayHint ? (
        <p className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          {checkout.alipayHint}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="outline" className="sm:min-w-[7rem]" onClick={onCancel} disabled={paying}>
            {t('dashboard:billing.payCancel')}
          </Button>
        ) : null}
        <Button
          className="sm:min-w-[7rem]"
          onClick={() => void handlePay()}
          disabled={paying || !method}
        >
          {paying ? t('dashboard:billing.payRedirecting') : t('dashboard:billing.payConfirm')}
        </Button>
      </div>
    </div>
  )
}
