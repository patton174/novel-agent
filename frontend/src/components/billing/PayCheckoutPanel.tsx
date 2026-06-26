import { CheckCircle2, Copy, Loader2, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PayCheckoutResult, PayMethodOption } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import {
  PayMethodIcon,
  resolvePayMethodLabel,
  resolvePayOrderStatusLabel,
} from './payMethodMeta'
import { formatPayPrice, usePayCheckout } from './usePayCheckout'
import { appToast } from '@/stores/appToastStore'

export interface PayCheckoutPanelProps {
  planCode: string | null
  orderId?: string | null
  enabled?: boolean
  /** page：独立结账页；embedded：弹窗；inline：内嵌卡片 */
  layout?: 'inline' | 'embedded' | 'page'
  onCancel?: () => void
  onCheckoutResolved?: (checkout: PayCheckoutResult) => void
  className?: string
}

export function PayCheckoutPanel({
  planCode,
  orderId,
  enabled = true,
  layout = 'inline',
  onCancel,
  onCheckoutResolved,
  className,
}: PayCheckoutPanelProps) {
  const { t } = useTranslation(['marketing', 'dashboard'])
  const active = enabled && Boolean(planCode || orderId)
  const { loading, paying, checkout, method, setMethod, handlePay } = usePayCheckout({
    planCode,
    orderId,
    enabled: active,
    onCheckoutResolved,
  })

  const isPage = layout === 'page'
  const shellClass = isPage
    ? 'space-y-0'
    : layout === 'inline'
      ? cn(MKT_SURFACE_CARD_PAD, 'space-y-6')
      : 'space-y-4 py-1'

  const copyOrderId = async () => {
    if (!checkout?.orderId) return
    try {
      await navigator.clipboard.writeText(checkout.orderId)
      appToast.success(t('dashboard:billing.payOrderCopied'))
    } catch {
      appToast.error(t('dashboard:billing.payFail'))
    }
  }

  if (!planCode && !orderId) {
    return null
  }

  if (loading && !checkout) {
    return (
      <div
        className={cn(
          shellClass,
          'flex min-h-[280px] items-center justify-center',
          isPage && MKT_SURFACE_CARD_PAD,
          className,
        )}
      >
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!checkout) {
    return (
      <div className={cn(shellClass, isPage && MKT_SURFACE_CARD_PAD, className)}>
        <p className="text-center text-sm text-muted-foreground">{t('dashboard:billing.payFail')}</p>
        {onCancel ? (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={onCancel}>
              {t('dashboard:billing.payCancel')}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const paid = checkout.status === 'DONE'

  return (
    <div className={cn(shellClass, className)}>
      {checkout.resumed ? (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {t('dashboard:billing.payResumedPending')}
        </p>
      ) : null}

      <div
        className={cn(
          'grid gap-6 lg:grid-cols-2 lg:gap-0',
          isPage && cn(MKT_SURFACE_CARD, 'overflow-hidden'),
        )}
      >
        {/* Left: order info */}
        <section
          className={cn(
            'space-y-5',
            isPage ? 'border-b border-foreground/10 bg-muted/20 p-6 lg:border-b-0 lg:border-r' : '',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-foreground/15 bg-background">
              <Receipt className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
                {t('marketing:pricing.checkout.orderInfo')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('marketing:pricing.checkout.subtitle')}
              </p>
            </div>
          </div>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('dashboard:billing.payOrderId')}
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="break-all font-mono text-sm text-foreground">{checkout.orderId}</code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => void copyOrderId()}
                  aria-label={t('dashboard:billing.payOrderCopied')}
                >
                  <Copy className="size-4" />
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('marketing:pricing.checkout.planLabel')}
              </dt>
              <dd className="mt-1 text-base font-semibold text-foreground">{checkout.planName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('marketing:pricing.checkout.amountLabel')}
              </dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums text-foreground">
                {formatPayPrice(checkout.amountCents, checkout.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('marketing:pricing.checkout.statusLabel')}
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                {paid ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
                <span className={cn('font-medium', paid ? 'text-emerald-700' : 'text-foreground')}>
                  {resolvePayOrderStatusLabel(checkout.status, t)}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Right: payment */}
        <section className={cn('space-y-5', isPage && 'p-6')}>
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
              {t('marketing:pricing.checkout.paymentInfo')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('marketing:pricing.checkout.selectMethod')}
            </p>
          </div>

          {paid ? (
            <div className="rounded-xl border border-emerald-300/70 bg-emerald-50 px-4 py-6 text-center dark:border-emerald-800/60 dark:bg-emerald-950/30">
              <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
              <p className="mt-3 text-sm font-medium text-emerald-800 dark:text-emerald-100">
                {t('dashboard:billing.paySuccess')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                {checkout.payments.map((p: PayMethodOption) => {
                  const selected = method === p.method
                  const label = resolvePayMethodLabel(p.method, p.name, t)
                  return (
                    <button
                      key={p.method}
                      type="button"
                      onClick={() => setMethod(p.method)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors',
                        selected
                          ? 'border-primary bg-primary/10 shadow-[2px_2px_0_0_hsl(var(--primary))]'
                          : 'border-border bg-background hover:bg-muted/50',
                      )}
                    >
                      <PayMethodIcon method={p.method} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{label}</span>
                        {p.desc ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{p.desc}</span>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>

              {checkout.alipayHint ? (
                <p className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                  {checkout.alipayHint}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
            </>
          )}
        </section>
      </div>
    </div>
  )
}
