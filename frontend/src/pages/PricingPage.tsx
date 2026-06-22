import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPlans, formatTokenCount, type PlanPublic } from '@/api/billingApi'
import { MKT_CTA_TIER_HIGHLIGHT, MKT_CTA_TIER_OUTLINE } from '@/lib/marketingCta'
import { MKT_SECTION_WRAP, MKT_SURFACE_CARD, MKT_SURFACE_CARD_PAD } from '@/lib/marketingSubpageClasses'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { BreathingHotBadge } from '@/components/marketing/BreathingHotBadge'

const FAQ_KEYS = ['1', '2', '3'] as const

export default function PricingPage() {
  const { t } = useTranslation(['marketing', 'common'])
  const [plans, setPlans] = useState<PlanPublic[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>('1')

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

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {plans === null
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className={cn(MKT_SURFACE_CARD, 'min-h-[380px]')} />
                ))
              : plans.map((tier) => (
                  <div
                    key={tier.code}
                    className={cn(
                      MKT_SURFACE_CARD_PAD,
                      'group relative flex flex-col transition-transform duration-300 hover:-translate-y-1',
                      tier.highlight
                        ? 'z-10 border-primary bg-primary/5 shadow-[4px_4px_0_0_hsl(var(--primary))] md:-my-2 md:scale-[1.02]'
                        : 'hover:border-primary/60',
                    )}
                  >
                    {tier.highlight ? (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <BreathingHotBadge label={t('pricing.hotBadge')} />
                      </div>
                    ) : null}

                    <div className="relative mb-6 pt-2">
                      <h3
                        className={`mb-2 text-xl font-semibold tracking-tight ${
                          tier.highlight ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {tier.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold tabular-nums text-foreground">
                          {tier.priceLabel}
                        </span>
                        {tier.periodLabel ? (
                          <span className="font-medium text-muted-foreground">{tier.periodLabel}</span>
                        ) : null}
                      </div>
                      {tier.description ? (
                        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                          {tier.description}
                        </p>
                      ) : null}
                    </div>

                    <ul className="mb-8 flex-1 space-y-3.5">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check
                            className={`mt-0.5 size-4 shrink-0 ${
                              tier.highlight ? 'text-primary' : 'text-primary/80'
                            }`}
                          />
                          <span className="text-sm text-foreground/90">{feature}</span>
                        </li>
                      ))}
                      {tier.monthlyTokenQuota != null ? (
                        <li className="flex items-start gap-3">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary/80" />
                          <span className="text-sm text-foreground/90">
                            {t('pricing.tokensPerMonth', {
                              label: formatTokenCount(tier.monthlyTokenQuota),
                            })}
                          </span>
                        </li>
                      ) : tier.code === 'enterprise' ? (
                        <li className="flex items-start gap-3">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary/80" />
                          <span className="text-sm text-foreground/90">{t('pricing.unlimitedTokens')}</span>
                        </li>
                      ) : null}
                    </ul>

                    <Link
                      to={tier.code === 'hobby' ? '/register' : '/contact'}
                      className={tier.highlight ? MKT_CTA_TIER_HIGHLIGHT : MKT_CTA_TIER_OUTLINE}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                ))}
          </div>

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
                      <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
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
