import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  fetchContentStats,
  fetchPlatformStats,
  type ContentStats,
  type PlatformStats,
} from '@/api/adminApi'
import {
  fetchPlatformUsageOverview,
  formatCostMicros,
  formatTokenQuota,
  type PlatformUsageOverview,
} from '@/api/billingAdminApi'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader } from '@/components/layout/AppPageStack'
import { AdminStatStrip } from '@/components/layout/AdminDataLayout'
import { AdminQuickLinks } from '@/components/admin/AdminQuickLinks'
import { appToast } from '@/stores/appToastStore'

export default function AdminHomePage() {
  const { t } = useTranslation(['admin'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [content, setContent] = useState<ContentStats | null>(null)
  const [billing, setBilling] = useState<PlatformUsageOverview | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      fetchPlatformStats(),
      fetchContentStats(),
      fetchPlatformUsageOverview().catch((err: unknown) => {
        if (!cancelled) {
          setBillingError(err instanceof Error ? err.message : t('admin:home.billingLoadFail'))
        }
        return null
      }),
    ])
      .then(([platformStats, contentStats, billingOverview]) => {
        if (cancelled) {
          return
        }
        setPlatform(platformStats)
        setContent(contentStats)
        setBilling(billingOverview)
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return
        }
        setPlatform({ totalUsers: 0, todayRegistrations: 0, activeUsers: 0 })
        setContent({ totalNovels: 0, totalChapters: 0, totalAgentRuns: 0 })
        appToast.error(err instanceof Error ? err.message : t('admin:home.loadStatsFail'))
      })

    return () => {
      cancelled = true
    }
  }, [t])

  const loading = platform === null || content === null

  const subsSummary = billing
    ? Object.entries(billing.activeSubscriptions)
        .map(([code, count]) => `${code}: ${count}`)
        .join(' · ')
    : ''

  const platformStatItems = useMemo(
    () => [
      { label: t('admin:home.totalUsers'), value: platform?.totalUsers.toLocaleString(dateLocale) ?? '—' },
      { label: t('admin:home.todayRegistrations'), value: platform?.todayRegistrations.toLocaleString(dateLocale) ?? '—' },
      { label: t('admin:home.activeUsers'), value: platform?.activeUsers.toLocaleString(dateLocale) ?? '—' },
      { label: t('admin:home.totalNovels'), value: content?.totalNovels.toLocaleString(dateLocale) ?? '—' },
      { label: t('admin:home.totalChapters'), value: content?.totalChapters.toLocaleString(dateLocale) ?? '—' },
      { label: t('admin:home.totalAgentRuns'), value: content?.totalAgentRuns.toLocaleString(dateLocale) ?? '—' },
    ],
    [content, dateLocale, platform, t],
  )

  const billingStatItems = useMemo(
    () =>
      billing
        ? [
            {
              label: t('admin:revenue.mrr'),
              value: `¥${(billing.mrrCents / 100).toFixed(0)}`,
              emphasis: true as const,
              hint: subsSummary || t('admin:revenue.noSubs'),
            },
            { label: t('admin:revenue.monthTokens'), value: formatTokenQuota(billing.monthTokensTotal) },
            { label: t('admin:revenue.monthCost'), value: formatCostMicros(billing.monthCostMicros) },
            { label: t('admin:revenue.monthRevenue'), value: formatCostMicros(billing.monthRevenueMicros) },
          ]
        : [],
    [billing, subsSummary, t],
  )

  return (
    <AppPageStack className="gap-5">
      <AdminStatStrip loading={loading} items={platformStatItems} />

      <AppShellCard>
        <AppShellCardHeader title={t('admin:home.quickLinksTitle')} description={t('admin:home.quickLinksDesc')} />
        <AppShellCardBody className="py-3">
          <AdminQuickLinks />
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={t('admin:home.billingTitle')}
          description={billingError ?? t('admin:home.billingDesc')}
          action={
            <Link
              to="/admin/analytics/revenue"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t('admin:home.openRevenueAnalytics')}
              <ArrowRight className="size-3" />
            </Link>
          }
        />
        <AppShellCardBody className="py-3">
          {billing ? (
            <AdminStatStrip items={billingStatItems} />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {billingError ?? t('admin:home.billingEmpty')}
            </p>
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
