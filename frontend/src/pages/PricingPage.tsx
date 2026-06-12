import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPlans, formatTokenCount, type PlanPublic } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import { BreathingHotBadge } from '@/components/marketing/BreathingHotBadge'

const FAQ_KEYS = ['1', '2', '3'] as const

export default function PricingPage() {
  const { t } = useTranslation('marketing')
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
    <MarketingPageLayout>
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

      <div className="relative px-6 pb-24">
        <div className="relative mx-auto max-w-6xl space-y-16 pt-12">
          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {plans === null
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[440px] rounded-3xl" />
                ))
              : plans.map((tier) => (
                  <div
                    key={tier.code}
                    className={`group relative flex flex-col rounded-3xl border bg-surface/80 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 ${
                      tier.highlight
                        ? 'z-10 scale-[1.03] border-primary/50 shadow-[0_24px_70px_-20px_rgba(79,70,229,0.55)] ring-2 ring-primary/20 md:-my-3'
                        : 'border-border/80 shadow-soft hover:border-primary/25 hover:shadow-[0_20px_50px_-20px_rgba(79,70,229,0.2)]'
                    }`}
                  >
                    {tier.highlight ? (
                      <>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-primary/20 via-transparent to-violet-500/10 opacity-80"
                        />
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                          <BreathingHotBadge label={t('pricing.hotBadge')} />
                        </div>
                      </>
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

                    <Button
                      variant={tier.highlight ? 'default' : 'outline'}
                      className={`h-12 w-full rounded-xl text-base font-semibold transition-all duration-300 ${
                        tier.highlight
                          ? 'shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
                          : 'group-hover:border-primary/40'
                      }`}
                      asChild
                    >
                      <Link to={tier.code === 'hobby' ? '/register' : '/contact'}>{tier.cta}</Link>
                    </Button>
                  </div>
                ))}
          </div>

          <div className="mx-auto max-w-2xl">
            <h2 className="mb-6 text-center text-xl font-semibold text-foreground">{t('pricing.faqTitle')}</h2>
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-white/80 shadow-[0_12px_40px_-16px_rgba(79,70,229,0.12)] backdrop-blur-sm">
              {FAQ_KEYS.map((key) => {
                const open = openFaq === key
                return (
                  <div key={key}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-surface-hover"
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
