import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { fetchPayOrderStatus } from '@/api/billingApi'
import { PayCheckoutPanel } from '@/components/billing/PayCheckoutPanel'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { buildLoginHref } from '@/lib/authRedirect'
import { appToast } from '@/stores/appToastStore'
import { useAuthReady } from '@/security/useAuthReady'
import { getAccessToken } from '@/security/sessionStore'

export default function PayCheckoutPage() {
  const { t } = useTranslation(['marketing', 'dashboard'])
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const authReady = useAuthReady()
  const isLoggedIn = authReady && !!getAccessToken()

  const planCode = searchParams.get('plan')?.trim() || null
  const orderId = searchParams.get('order')?.trim() || null
  const payReturn = searchParams.get('return') === '1'

  const [reloadNonce, setReloadNonce] = useState(0)
  const [returnChecking, setReturnChecking] = useState(false)

  useEffect(() => {
    if (!authReady) return
    if (!isLoggedIn) {
      const returnPath = `/checkout${window.location.search}`
      window.location.href = buildLoginHref({ returnPath })
    }
  }, [authReady, isLoggedIn])

  const clearReturnParam = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('return')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  useEffect(() => {
    if (!payReturn || !orderId || !isLoggedIn) {
      setReturnChecking(false)
      return
    }

    let cancelled = false
    let attempts = 0
    setReturnChecking(true)

    const poll = async (): Promise<void> => {
      if (cancelled) return
      try {
        const status = await fetchPayOrderStatus(orderId)
        if (cancelled) return
        if (status.paid) {
          appToast.success(t('dashboard:billing.paySuccess'))
          clearReturnParam()
          setReloadNonce((n) => n + 1)
          setReturnChecking(false)
          return
        }
      } catch {
        if (cancelled) return
      }
      attempts += 1
      if (attempts >= 15) {
        appToast.info(t('dashboard:billing.payPending'))
        clearReturnParam()
        setReturnChecking(false)
        return
      }
      window.setTimeout(() => {
        void poll()
      }, 2000)
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [payReturn, orderId, isLoggedIn, clearReturnParam, t])

  const handleCheckoutResolved = useCallback(
    (checkout: { orderId: string; planCode: string }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          let changed = false
          if (!prev.get('order')) {
            next.set('order', checkout.orderId)
            changed = true
          }
          if (checkout.planCode && !prev.get('plan')) {
            next.set('plan', checkout.planCode)
            changed = true
          }
          return changed ? next : prev
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  if (!authReady || !isLoggedIn) {
    return null
  }

  if (!planCode && !orderId) {
    return (
      <MarketingPageLayout footerVariant="linksOnly">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            {t('marketing:pricing.checkout.title')}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">
            {t('marketing:pricing.checkout.missingParamsTitle')}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t('marketing:pricing.checkout.missingParamsSubtitle')}
          </p>
          <Link
            to="/pricing"
            className="mt-8 font-mono text-sm font-bold uppercase text-primary hover:underline"
          >
            {t('marketing:recommend.viewPricing')}
          </Link>
        </div>
      </MarketingPageLayout>
    )
  }

  return (
    <MarketingPageLayout footerVariant="linksOnly">
      <div className="flex min-h-0 flex-1 flex-col">
        {returnChecking ? (
          <div className="flex shrink-0 items-center justify-center gap-2 border-b border-primary/20 bg-primary/5 px-6 py-3 text-sm text-primary">
            <Loader2 className="size-4 animate-spin" />
            {t('dashboard:billing.payReturnChecking')}
          </div>
        ) : null}
        <PayCheckoutPanel
          layout="page"
          planCode={planCode}
          orderId={orderId}
          enabled={!returnChecking}
          reloadNonce={reloadNonce}
          onCheckoutResolved={handleCheckoutResolved}
          onCancel={() => navigate('/pricing')}
          className="min-h-0 flex-1"
        />
      </div>
    </MarketingPageLayout>
  )
}
