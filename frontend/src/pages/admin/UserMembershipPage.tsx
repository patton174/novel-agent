import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  fetchAdminPlans,
  fetchPlatformUsageOverview,
  formatPlanPrice,
  type AdminPlan,
  type PlatformUsageOverview,
} from '@/api/billingAdminApi'
import { AdminButtonGhost } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
  AdminStatStrip,
} from '@/components/layout/AdminDataLayout'
import {
  PixelBadge,
  PixelCellStack,
  PixelTable,
  type PixelColumn,
} from '@/components/pixel'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { adminFormatLocale } from '@/components/admin/adminUiTokens'
import { appToast } from '@/stores/appToastStore'
import { Skeleton } from '@/components/ui/skeleton'

export default function UserMembershipPage() {
  const { t, i18n } = useTranslation(['admin', 'dashboard'])
  const dateLocale = adminFormatLocale(i18n.language)
  useMarkRouteSeen()
  const [plans, setPlans] = useState<AdminPlan[] | null>(null)
  const [overview, setOverview] = useState<PlatformUsageOverview | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchAdminPlans(),
      fetchPlatformUsageOverview().catch(() => null),
    ])
      .then(([planList, usage]) => {
        if (cancelled) return
        setPlans(planList)
        setOverview(usage)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        appToast.error(err instanceof Error ? err.message : t('admin:membership.loadFail'))
        setPlans([])
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const activeTotal = overview
    ? Object.values(overview.activeSubscriptions).reduce((a, b) => a + b, 0)
    : null

  const columns: PixelColumn<AdminPlan>[] = [
    {
      key: 'plan',
      header: t('admin:plans.colPlan'),
      render: (plan) => (
        <PixelCellStack title={plan.name} subtitle={`${plan.code} · ${formatPlanPrice(plan.priceCents)}`} />
      ),
    },
    {
      key: 'quota',
      header: t('admin:membership.colQuota'),
      render: (plan) => (
        <span className="font-mono text-xs tabular-nums">
          {plan.monthlyTokenQuota != null ? plan.monthlyTokenQuota.toLocaleString(dateLocale) : t('admin:jobs.duration.dash')}{' '}
          {t('dashboard:billing.tokenAbbrev')}
        </span>
      ),
    },
    {
      key: 'active',
      header: t('admin:membership.colActiveSubs'),
      render: (plan) => {
        const count = overview?.activeSubscriptions[plan.code]
        return count != null ? count.toLocaleString(dateLocale) : t('admin:jobs.duration.dash')
      },
    },
    {
      key: 'ready',
      header: t('admin:membership.colPayReady'),
      render: (plan) => (
        <PixelBadge tone={plan.paymentReady ? 'success' : 'warning'}>
          {plan.paymentReady ? t('admin:plans.paymentReady') : t('admin:plans.paymentNotReady')}
        </PixelBadge>
      ),
    },
  ]

  return (
    <AdminDataPage>
      <AdminStatStrip
        loading={plans === null}
        items={[
          { label: t('admin:membership.statPlans'), value: plans?.length.toLocaleString(dateLocale) ?? '—' },
          { label: t('admin:membership.statActiveSubs'), value: activeTotal?.toLocaleString(dateLocale) ?? '—' },
          {
            label: t('admin:revenue.mrr'),
            value: overview ? `¥${(overview.mrrCents / 100).toFixed(0)}` : '—',
          },
        ]}
      />

      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:membership.title')}
          description={t('admin:membership.desc')}
          action={
            <div className="flex flex-wrap gap-2">
              <AdminButtonGhost asChild>
                <Link to="/admin/billing/plans">
                  {t('admin:membership.openPlans')}
                  <ArrowRight className="size-3.5" />
                </Link>
              </AdminButtonGhost>
              <AdminButtonGhost asChild>
                <Link to="/admin/users">
                  {t('admin:membership.openUsers')}
                  <ArrowRight className="size-3.5" />
                </Link>
              </AdminButtonGhost>
            </div>
          }
        />
        <AdminDataPanelBody>
          {plans === null ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : (
            <PixelTable
              columns={columns}
              data={plans}
              rowKey="id"
              emptyText={t('admin:membership.noPlans')}
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">{t('admin:membership.perUserHint')}</p>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
