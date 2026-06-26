import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Bot, BookOpen, FileText, UserCheck, UserPlus, Users } from 'lucide-react'
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
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader, AppStatCard } from '@/components/layout/AppPageStack'
import { AdminQuickLinks } from '@/components/admin/AdminQuickLinks'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'

export default function AdminHomePage() {
  const { t } = useTranslation(['admin'])
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [content, setContent] = useState<ContentStats | null>(null)
  const [billing, setBilling] = useState<PlatformUsageOverview | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)

  const STAT_CARDS = [
    {
      key: 'totalUsers',
      label: t('admin:home.totalUsers'),
      icon: Users,
      source: 'platform' as const,
      iconClassName: 'text-blue-600',
      iconBgClassName: 'bg-blue-500/10',
    },
    {
      key: 'todayRegistrations',
      label: t('admin:home.todayRegistrations'),
      icon: UserPlus,
      source: 'platform' as const,
      iconClassName: 'text-emerald-600',
      iconBgClassName: 'bg-emerald-500/10',
    },
    {
      key: 'activeUsers',
      label: t('admin:home.activeUsers'),
      icon: UserCheck,
      source: 'platform' as const,
      iconClassName: 'text-violet-600',
      iconBgClassName: 'bg-violet-500/10',
    },
    {
      key: 'totalNovels',
      label: t('admin:home.totalNovels'),
      icon: BookOpen,
      source: 'content' as const,
      iconClassName: 'text-amber-600',
      iconBgClassName: 'bg-amber-500/10',
    },
    {
      key: 'totalChapters',
      label: t('admin:home.totalChapters'),
      icon: FileText,
      source: 'content' as const,
      iconClassName: 'text-cyan-600',
      iconBgClassName: 'bg-cyan-500/10',
    },
    {
      key: 'totalAgentRuns',
      label: t('admin:home.totalAgentRuns'),
      icon: Bot,
      source: 'content' as const,
      iconClassName: 'text-rose-600',
      iconBgClassName: 'bg-rose-500/10',
    },
  ] as const

  type StatKey = (typeof STAT_CARDS)[number]['key']

  function getStatValue(
    platform: PlatformStats | null,
    content: ContentStats | null,
    key: StatKey,
    source: 'platform' | 'content',
  ): number | null {
    if (source === 'platform') {
      return platform ? platform[key as keyof PlatformStats] : null
    }
    return content ? content[key as keyof ContentStats] : null
  }

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

  return (
    <AppPageStack className="gap-5">
      <AppShellCard>
        <AppShellCardHeader title={t('admin:home.quickLinksTitle')} description={t('admin:home.quickLinksDesc')} />
        <AppShellCardBody className="py-3">
          <AdminQuickLinks />
        </AppShellCardBody>
      </AppShellCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AppShellCard className="col-span-2 lg:col-span-3">
          <AppShellCardHeader
            title={t('admin:home.snapshotTitle')}
            description={t('admin:home.snapshotDesc')}
            action={
              <Link
                to="/admin/analytics"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {t('admin:home.openAnalytics')}
                <ArrowRight className="size-3" />
              </Link>
            }
          />
        </AppShellCard>
        {STAT_CARDS.map((stat) => {
          const raw = getStatValue(platform, content, stat.key, stat.source)
          return (
            <AppStatCard
              key={stat.key}
              label={stat.label}
              icon={stat.icon}
              iconClassName={stat.iconClassName}
              iconBgClassName={stat.iconBgClassName}
              loading={loading}
              value={raw == null ? '—' : raw.toLocaleString('zh-CN')}
            />
          )
        })}
      </div>

      <AppShellCard>
        <AppShellCardHeader
          title={t('admin:home.billingTitle')}
          description={billingError ?? t('admin:home.billingDesc')}
          action={
            <Link
              to="/admin/analytics?tab=revenue"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t('admin:home.openRevenueAnalytics')}
              <ArrowRight className="size-3" />
            </Link>
          }
        />
        <AppShellCardBody className="py-3">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : billing ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AdminHomeBillingStat
                title={t('admin:revenue.mrr')}
                value={`¥${(billing.mrrCents / 100).toFixed(0)}`}
                hint={subsSummary || t('admin:revenue.noSubs')}
              />
              <AdminHomeBillingStat
                title={t('admin:revenue.monthTokens')}
                value={formatTokenQuota(billing.monthTokensTotal)}
              />
              <AdminHomeBillingStat
                title={t('admin:revenue.monthCost')}
                value={formatCostMicros(billing.monthCostMicros)}
              />
              <AdminHomeBillingStat
                title={t('admin:revenue.monthRevenue')}
                value={formatCostMicros(billing.monthRevenueMicros)}
              />
            </div>
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

function AdminHomeBillingStat({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
      {hint ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
