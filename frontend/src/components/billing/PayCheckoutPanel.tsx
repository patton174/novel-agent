import { CheckCircle2, Copy, Loader2, Receipt, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PayCheckoutResult, PayMethodOption } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
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
  /** page：独立结账页全宽左右栏；embedded：弹窗；inline：内嵌卡片 */
  layout?: 'inline' | 'embedded' | 'page'
  reloadNonce?: number
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
  reloadNonce = 0,
  className,
}: PayCheckoutPanelProps) {
  const { t } = useTranslation(['marketing', 'dashboard'])
  const active = enabled && Boolean(planCode || orderId)
  const { loading, paying, checkout, method, setMethod, handlePay } = usePayCheckout({
    planCode,
    orderId,
    enabled: active,
    reloadNonce,
    onCheckoutResolved,
  })

  const isPage = layout === 'page'
  const shellClass = isPage
    ? 'flex min-h-0 flex-1 flex-col'
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
          'flex flex-1 items-center justify-center',
          !isPage && 'min-h-[280px]',
          className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!checkout) {
    return (
      <div className={cn(shellClass, 'flex flex-1 items-center justify-center', className)}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{t('dashboard:billing.payFail')}</p>
          {onCancel ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={onCancel}>
                {t('dashboard:billing.payCancel')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const paid = checkout.status === 'DONE'

  const pagePad = 'px-6 py-10 md:px-12 md:py-14 lg:px-16 xl:px-24'
  const compactPad = isPage ? '' : ''

  return (
    <div className={cn(shellClass, className)}>
      {checkout.resumed && !isPage ? (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {t('dashboard:billing.payResumedPending')}
        </p>
      ) : null}

      <div
        className={cn(
          'min-h-0 flex-1',
          isPage ? 'grid lg:grid-cols-2' : 'grid gap-6 lg:grid-cols-2 lg:gap-0',
        )}
      >
        {/* Left: order info */}
        <section
          className={cn(
            'flex flex-col',
            isPage
              ? cn(
                  pagePad,
                  'justify-center border-b border-foreground/10 bg-muted/30 lg:border-b-0 lg:border-r',
                )
              : 'space-y-5',
          )}
        >
          {isPage ? (
            <div className="mb-8 lg:mb-12">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                {t('marketing:pricing.checkout.title')}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t('marketing:pricing.checkout.pageTitle')}
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                {t('marketing:pricing.checkout.subtitle')}
              </p>
              {checkout.resumed ? (
                <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                  {t('dashboard:billing.payResumedPending')}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mb-2 flex items-start gap-3">
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
          )}

          <dl className={cn('space-y-5 text-sm', isPage && 'max-w-lg')}>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('dashboard:billing.payOrderId')}
              </dt>
              <dd className="mt-1.5 flex items-center gap-2">
                <code
                  className={cn(
                    'break-all font-mono text-foreground',
                    isPage ? 'text-sm md:text-base' : 'text-sm',
                  )}
                >
                  {checkout.orderId}
                </code>
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
              <dd
                className={cn(
                  'mt-1 font-semibold text-foreground',
                  isPage ? 'text-xl md:text-2xl' : 'text-base',
                )}
              >
                {checkout.planName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('marketing:pricing.checkout.amountLabel')}
              </dt>
              <dd
                className={cn(
                  'mt-1 font-bold tabular-nums text-foreground',
                  isPage ? 'text-4xl md:text-5xl' : 'text-3xl',
                )}
              >
                {formatPayPrice(checkout.amountCents, checkout.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('marketing:pricing.checkout.statusLabel')}
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                {paid ? <CheckCircle2 className="size-5 text-emerald-600" /> : null}
                <span
                  className={cn(
                    'font-medium',
                    isPage ? 'text-base' : 'text-sm',
                    paid ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
                  )}
                >
                  {resolvePayOrderStatusLabel(checkout.status, t)}
                </span>
              </dd>
            </div>
          </dl>

          {isPage && onCancel ? (
            <div className="mt-10 hidden lg:block">
              <Button variant="ghost" className="px-0 text-muted-foreground" onClick={onCancel}>
                {t('dashboard:billing.payCancel')}
              </Button>
            </div>
          ) : null}
        </section>

        {/* Right: payment */}
        <section
          className={cn(
            'flex flex-col',
            isPage ? cn(pagePad, 'justify-center bg-background') : cn('space-y-5', compactPad),
          )}
        >
          <div className={cn(isPage && 'mb-8 max-w-xl')}>
            <div className="flex items-start gap-3">
              {isPage ? (
                <div className="flex size-11 items-center justify-center rounded-xl border-2 border-foreground/15 bg-muted/40">
                  <Wallet className="size-5 text-primary" />
                </div>
              ) : null}
              <div>
                <h2
                  className={cn(
                    'font-bold text-foreground',
                    isPage
                      ? 'font-mono text-sm uppercase tracking-wide'
                      : 'font-mono text-sm uppercase tracking-wide',
                  )}
                >
                  {t('marketing:pricing.checkout.paymentInfo')}
                </h2>
                <p className={cn('mt-1 text-muted-foreground', isPage ? 'text-sm md:text-base' : 'text-sm')}>
                  {t('marketing:pricing.checkout.selectMethod')}
                </p>
              </div>
            </div>
          </div>

          <div className={cn(isPage && 'max-w-xl')}>
            {paid ? (
              <div className="rounded-xl border border-emerald-300/70 bg-emerald-50 px-6 py-10 text-center dark:border-emerald-800/60 dark:bg-emerald-950/30">
                <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
                <p className="mt-4 text-base font-medium text-emerald-800 dark:text-emerald-100">
                  {t('dashboard:billing.paySuccess')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {checkout.payments.map((p: PayMethodOption) => {
                    const selected = method === p.method
                    const label = resolvePayMethodLabel(p.method, p.name, t)
                    return (
                      <button
                        key={p.method}
                        type="button"
                        onClick={() => setMethod(p.method)}
                        className={cn(
                          'flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-colors',
                          isPage && 'md:px-5 md:py-5',
                          selected
                            ? 'border-primary bg-primary/10 shadow-[3px_3px_0_0_hsl(var(--primary))]'
                            : 'border-border bg-background hover:border-foreground/30 hover:bg-muted/40',
                        )}
                      >
                        <PayMethodIcon method={p.method} className={isPage ? 'size-9' : undefined} />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block font-semibold text-foreground',
                              isPage ? 'text-base' : 'text-sm',
                            )}
                          >
                            {label}
                          </span>
                          {p.desc ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground md:text-sm">
                              {p.desc}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {checkout.alipayHint ? (
                  <p className="mt-4 rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100 md:text-sm">
                    {checkout.alipayHint}
                  </p>
                ) : null}

                <div
                  className={cn(
                    'flex flex-col-reverse gap-3 pt-6',
                    isPage ? 'sm:flex-row sm:items-center' : 'sm:flex-row sm:justify-end',
                  )}
                >
                  {onCancel ? (
                    <Button
                      variant="outline"
                      className={cn(isPage && 'sm:min-w-[8rem]')}
                      onClick={onCancel}
                      disabled={paying}
                    >
                      {t('dashboard:billing.payCancel')}
                    </Button>
                  ) : null}
                  <Button
                    className={cn(isPage && 'sm:min-w-[10rem] sm:flex-1 lg:flex-none')}
                    size={isPage ? 'lg' : 'default'}
                    onClick={() => void handlePay()}
                    disabled={paying || !method}
                  >
                    {paying ? t('dashboard:billing.payRedirecting') : t('dashboard:billing.payConfirm')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
