import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPlans, formatTokenCount, type PlanPublic } from '@/api/billingApi'
import { PayCheckoutPanel } from '@/components/billing/PayCheckoutPanel'
import { buildLoginHref } from '@/lib/authRedirect'
import { MKT_CTA_TIER_HIGHLIGHT, MKT_CTA_TIER_OUTLINE } from '@/lib/marketingCta'
import { MKT_SECTION_WRAP, MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { BreathingHotBadge } from '@/components/marketing/BreathingHotBadge'
import { useAuthReady } from '@/security/useAuthReady'
import { getAccessToken } from '@/security/sessionStore'

const FAQ_KEYS = ['1', '2', '3'] as const

export default function PricingPage() {
  const { t } = useTranslation(['marketing', 'common', 'dashboard'])
  const authReady = useAuthReady()
  const isLoggedIn = authReady && !!getAccessToken()
  const [searchParams, setSearchParams] = useSearchParams()
  const checkoutRef = useRef<HTMLElement | null>(null)

  const [plans, setPlans] = useState<PlanPublic[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>('1')
  const [checkoutPlanCode, setCheckoutPlanCode] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchPlans()
      .then((data) => {
        if (!cancelled) setPlans(data)
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('pricing.loadError'))
          setPlans([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    const plan = searchParams.get('plan')?.trim()
    if (!plan || !isLoggedIn) return
    const exists = plans?.some((p) => p.code === plan && (p.priceCents ?? 0) > 0)
    if (exists) {
      setCheckoutPlanCode(plan)
      window.requestAnimationFrame(() => {
        checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [searchParams, plans, isLoggedIn])

  const selectCheckout = (planCode: string) => {
    setCheckoutPlanCode(planCode)
    setSearchParams({ plan: planCode })
    window.requestAnimationFrame(() => {
      checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const renderTierCta = (tier: PlanPublic) => {
    const ctaClass = cn(
      'mt-auto w-full text-center',
      tier.highlight ? MKT_CTA_TIER_HIGHLIGHT : MKT_CTA_TIER_OUTLINE,
    )
    const isSelected = checkoutPlanCode === tier.code

    if (tier.code === 'hobby') {
      return (
        <Link to="/register" className={ctaClass}>
          {tier.cta}
        </Link>
      )
    }
    if (tier.priceCents != null && tier.priceCents > 0) {
      if (isLoggedIn) {
        return (
          <button
            type="button"
            className={cn(ctaClass, isSelected && 'ring-2 ring-primary ring-offset-2')}
            onClick={() => selectCheckout(tier.code)}
          >
            {isSelected ? t('marketing:pricing.checkout.title') : t('dashboard:billing.payNow')}
          </button>
        )
      }
      return (
        <Link
          to={buildLoginHref({ returnPath: `/pricing?plan=${encodeURIComponent(tier.code)}` })}
          className={ctaClass}
        >
          {t('dashboard:billing.payNow')}
        </Link>
      )
    }
    return (
      <Link to="/contact" className={ctaClass}>
        {tier.cta}
      </Link>
    )
  }

  return (
    <MarketingPageLayout subpageCta>
      <MarketingSubpageHero
        variant="light"
        eyebrow={t('nav.pricing')}
        title={t('pricing.title')}
        subtitle={
          <>
            {t('pricing.subtitle')}
            <span className="mt-3 block text-sm text-muted-foreground">
              {t('pricing.feasibilityNote')}{' '}
              <Link to="/#feasibility" className="font-medium text-primary hover:underline">
                {t('pricing.feasibilityLink')}
              </Link>
            </span>
          </>
        }
      />

      <div className={cn(MKT_SECTION_WRAP, 'pb-24')}>
        <div className="relative space-y-16 pt-4 md:pt-8">
          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

          <div className="mx-auto grid max-w-5xl items-stretch gap-6 md:grid-cols-3 md:gap-8">
            {plans === null
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className={cn(MKT_SURFACE_CARD, 'min-h-[440px]')} />
                ))
              : plans.map((tier) => {
                  const isSelected = checkoutPlanCode === tier.code
                  return (
                    <div
                      key={tier.code}
                      className={cn(
                        MKT_SURFACE_CARD_PAD,
                        'relative flex min-h-[440px] flex-col transition-transform duration-300 hover:-translate-y-1',
                        tier.highlight
                          ? 'z-10 border-primary bg-primary/5 shadow-[4px_4px_0_0_hsl(var(--primary))] md:-my-2 md:scale-[1.02]'
                          : 'hover:border-primary/60',
                        isSelected && 'ring-2 ring-primary ring-offset-2',
                      )}
                    >
                      {tier.highlight ? (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <BreathingHotBadge label={t('pricing.hotBadge')} />
                        </div>
                      ) : null}

                      <div className="relative mb-5 border-b border-foreground/10 pb-5 pt-2">
                        <h3
                          className={cn(
                            'mb-3 text-xl font-semibold tracking-tight',
                            tier.highlight ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {tier.name}
                        </h3>
                        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                          <span className="text-4xl font-bold tabular-nums leading-none text-foreground">
                            {tier.priceLabel}
                          </span>
                          {tier.periodLabel ? (
                            <span className="pb-1 text-sm font-medium text-muted-foreground">
                              {tier.periodLabel}
                            </span>
                          ) : null}
                        </div>
                        {tier.description ? (
                          <p className="mt-4 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">
                            {tier.description}
                          </p>
                        ) : (
                          <div className="mt-4 min-h-[2.5rem]" />
                        )}
                      </div>

                      <ul className="mb-6 flex-1 space-y-3">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <Check
                              className={cn(
                                'mt-0.5 size-4 shrink-0',
                                tier.highlight ? 'text-primary' : 'text-primary/80',
                              )}
                            />
                            <span className="text-sm leading-snug text-foreground/90">{feature}</span>
                          </li>
                        ))}
                        {tier.monthlyTokenQuota != null ? (
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 size-4 shrink-0 text-primary/80" />
                            <span className="text-sm leading-snug text-foreground/90">
                              {t('pricing.tokensPerMonth', {
                                label: formatTokenCount(tier.monthlyTokenQuota),
                              })}
                            </span>
                          </li>
                        ) : tier.code === 'enterprise' ? (
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 size-4 shrink-0 text-primary/80" />
                            <span className="text-sm leading-snug text-foreground/90">
                              {t('pricing.unlimitedTokens')}
                            </span>
                          </li>
                        ) : null}
                        {tier.monthlyRunQuota != null ? (
                          <li className="flex items-start gap-3">
                            <Check className="mt-0.5 size-4 shrink-0 text-primary/80" />
                            <span className="text-sm leading-snug text-foreground/90">
                              {t('marketing:pricing.runsPerMonth', { count: tier.monthlyRunQuota })}
                            </span>
                          </li>
                        ) : null}
                      </ul>

                      {renderTierCta(tier)}
                    </div>
                  )
                })}
          </div>

          <section ref={checkoutRef} id="checkout" className="mx-auto max-w-2xl scroll-mt-24">
            {isLoggedIn && checkoutPlanCode ? (
              <PayCheckoutPanel
                planCode={checkoutPlanCode}
                onCancel={() => {
                  setCheckoutPlanCode(null)
                  setSearchParams({})
                }}
              />
            ) : (
              <div className={cn(MKT_SURFACE_CARD_PAD, 'text-center')}>
                <p className="text-sm text-muted-foreground">{t('marketing:pricing.checkout.choosePlanHint')}</p>
              </div>
            )}
          </section>

          <div className="mx-auto max-w-2xl">
            <h2 className="mb-6 text-center font-mono text-lg font-bold uppercase tracking-wide text-foreground md:text-xl">
              {t('pricing.faqTitle')}
            </h2>
            <div className={cn(MKT_SURFACE_CARD, 'divide-y-2 divide-foreground/20 overflow-hidden')}>
              {FAQ_KEYS.map((key) => {
                const open = openFaq === key
                return (
                  <div key={key}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-mono text-sm font-bold text-foreground transition-colors hover:bg-muted/50"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : key)}
                    >
                      {t(`pricing.faq.${key}.q`)}
                      <ChevronDown
                        className={cn(
                          'size-4 shrink-0 text-muted-foreground transition-transform',
                          open && 'rotate-180',
                        )}
                      />
                    </button>
                    {open ? (
                      <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                        {t(`pricing.faq.${key}.a`)}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  )
}
