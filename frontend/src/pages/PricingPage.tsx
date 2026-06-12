import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPlans, formatTokenCount, type PlanPublic } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { BreathingHotBadge } from '@/components/marketing/BreathingHotBadge'

export default function PricingPage() {
  const { t } = useTranslation('marketing')
  const [plans, setPlans] = useState<PlanPublic[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      <div className="relative overflow-hidden px-6 pb-24 pt-28">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/12 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl space-y-16">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              {t('nav.pricing')}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {t('pricing.title')}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">{t('pricing.subtitle')}</p>
          </div>

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
                        ? 'z-10 scale-[1.02] border-primary/40 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.45)] ring-1 ring-primary/25 md:-my-2'
                        : 'border-border/80 shadow-soft hover:border-primary/20 hover:shadow-hover'
                    }`}
                  >
                    {tier.highlight ? (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        <BreathingHotBadge label={t('pricing.hotBadge')} />
                      </div>
                    ) : null}

                    <div className="mb-6 pt-2">
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
                              count: formatTokenCount(tier.monthlyTokenQuota),
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
        </div>
      </div>
    </MarketingPageLayout>
  )
}
