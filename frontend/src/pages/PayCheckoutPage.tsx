import { useCallback, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PayCheckoutPanel } from '@/components/billing/PayCheckoutPanel'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { MKT_SECTION_WRAP } from '@/lib/marketingSubpageClasses'
import { buildLoginHref } from '@/lib/authRedirect'
import { cn } from '@/lib/utils'
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

  useEffect(() => {
    if (!authReady) return
    if (!isLoggedIn) {
      const returnPath = `/checkout${window.location.search}`
      window.location.href = buildLoginHref({ returnPath })
    }
  }, [authReady, isLoggedIn])

  const handleCheckoutResolved = useCallback(
    (checkout: { orderId: string; planCode: string }) => {
      const params = new URLSearchParams(window.location.search)
      let changed = false
      if (params.get('order') !== checkout.orderId) {
        params.set('order', checkout.orderId)
        changed = true
      }
      if (checkout.planCode && params.get('plan') !== checkout.planCode) {
        params.set('plan', checkout.planCode)
        changed = true
      }
      if (changed) {
        setSearchParams(params, { replace: true })
      }
    },
    [setSearchParams],
  )

  if (!authReady || !isLoggedIn) {
    return null
  }

  if (!planCode && !orderId) {
    return (
      <MarketingPageLayout subpageCta>
        <MarketingSubpageHero
          variant="light"
          eyebrow={t('marketing:pricing.checkout.title')}
          title={t('marketing:pricing.checkout.missingParamsTitle')}
          subtitle={t('marketing:pricing.checkout.missingParamsSubtitle')}
        />
        <div className={cn(MKT_SECTION_WRAP, 'pb-24 text-center')}>
          <Link
            to="/pricing"
            className="font-mono text-sm font-bold uppercase text-primary hover:underline"
          >
            {t('marketing:recommend.viewPricing')}
          </Link>
        </div>
      </MarketingPageLayout>
    )
  }

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="light"
        eyebrow={t('marketing:pricing.checkout.title')}
        title={t('marketing:pricing.checkout.pageTitle')}
        subtitle={t('marketing:pricing.checkout.subtitle')}
      />
      <div className={cn(MKT_SECTION_WRAP, 'mx-auto max-w-4xl pb-24')}>
        <PayCheckoutPanel
          layout="page"
          planCode={planCode}
          orderId={orderId}
          enabled
          onCheckoutResolved={handleCheckoutResolved}
          onCancel={() => navigate('/pricing')}
        />
      </div>
    </MarketingPageLayout>
  )
}
