import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPlans, formatTokenCount, type PlanPublic } from '@/api/billingApi'
import { buildLoginHref } from '@/lib/authRedirect'
import { cn } from '@/lib/utils'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthReady } from '@/security/useAuthReady'
import { getAccessToken } from '@/security/sessionStore'

export type PlanRecommendReason = 'quota' | 'upgrade' | 'feature'

export interface PlanRecommendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 优先推荐的套餐 code，默认 pro */
  recommendPlanCode?: string
  reason?: PlanRecommendReason
}

export function PlanRecommendDialog({
  open,
  onOpenChange,
  recommendPlanCode = 'pro',
  reason = 'upgrade',
}: PlanRecommendDialogProps) {
  const { t } = useTranslation(['marketing', 'dashboard'])
  const navigate = useNavigate()
  const authReady = useAuthReady()
  const isLoggedIn = authReady && !!getAccessToken()
  const [plans, setPlans] = useState<PlanPublic[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchPlans()
      .then((data) => {
        if (!cancelled) setPlans(data)
      })
      .catch(() => {
        if (!cancelled) setPlans([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const paidPlans = useMemo(
    () =>
      (plans ?? []).filter((p) => p.priceCents != null && p.priceCents > 0 && p.code !== 'enterprise'),
    [plans],
  )

  const sortedPlans = useMemo(() => {
    const list = [...paidPlans]
    list.sort((a, b) => {
      if (a.code === recommendPlanCode) return -1
      if (b.code === recommendPlanCode) return 1
      return (a.priceCents ?? 0) - (b.priceCents ?? 0)
    })
    return list
  }, [paidPlans, recommendPlanCode])

  const reasonText =
    reason === 'quota'
      ? t('marketing:recommend.quotaDesc')
      : reason === 'feature'
        ? t('marketing:recommend.featureDesc')
        : t('marketing:recommend.upgradeDesc')

  const startCheckout = (planCode: string) => {
    if (!isLoggedIn) {
      onOpenChange(false)
      window.location.href = buildLoginHref({ returnPath: `/checkout?plan=${encodeURIComponent(planCode)}` })
      return
    }
    onOpenChange(false)
    navigate(`/checkout?plan=${encodeURIComponent(planCode)}`)
  }

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      size="form"
      className="max-h-[90vh] sm:max-w-xl"
      title={t('marketing:recommend.title')}
      description={reasonText}
    >
      {loading ? (
        <div className="space-y-3 py-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3 py-1">
          {sortedPlans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('marketing:recommend.empty')}
            </p>
          ) : (
            sortedPlans.map((plan) => {
              const recommended = plan.code === recommendPlanCode || plan.highlight
              return (
                <article
                  key={plan.code}
                  className={cn(
                    'rounded-xl border px-4 py-4 transition-colors',
                    recommended
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-background hover:border-primary/40',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{plan.name}</p>
                        {recommended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <Sparkles className="size-3" />
                            {t('marketing:recommend.recommended')}
                          </span>
                        ) : null}
                      </div>
                      {plan.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                      ) : null}
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.slice(0, 3).map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            {feature}
                          </li>
                        ))}
                        {plan.monthlyTokenQuota != null ? (
                          <li className="flex items-start gap-2 text-sm text-foreground/90">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            {t('marketing:pricing.tokensPerMonth', {
                              label: formatTokenCount(plan.monthlyTokenQuota),
                            })}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums">{plan.priceLabel}</p>
                      {plan.periodLabel ? (
                        <p className="text-xs text-muted-foreground">{plan.periodLabel}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button className="flex-1 sm:flex-none" onClick={() => startCheckout(plan.code)}>
                      {t('dashboard:billing.payNow')}
                    </Button>
                    <Button variant="outline" className="flex-1 sm:flex-none" asChild>
                      <Link to={`/pricing?plan=${encodeURIComponent(plan.code)}`} onClick={() => onOpenChange(false)}>
                        {t('marketing:recommend.viewPricing')}
                      </Link>
                    </Button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      )}
    </AppModalShell>
  )
}
