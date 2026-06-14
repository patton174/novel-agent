import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { Bot, BookOpen, FileText, UserCheck, UserPlus, Users } from 'lucide-react'
import {
  fetchContentStats,
  fetchPlatformStats,
  type ContentStats,
  type PlatformStats,
} from '@/api/adminApi'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader, AppStatCard } from '@/components/layout/AppPageStack'
import { AdminQuickLinks } from '@/components/admin/AdminQuickLinks'
import { appToast } from '@/stores/appToastStore'

export default function AdminHomePage() {
  const { t } = useTranslation(['admin'])
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [content, setContent] = useState<ContentStats | null>(null)

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

    void Promise.all([fetchPlatformStats(), fetchContentStats()])
      .then(([platformStats, contentStats]) => {
        if (cancelled) {
          return
        }
        setPlatform(platformStats)
        setContent(contentStats)
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

  return (
    <AppPageStack className="gap-5">
      <AppShellCard>
        <AppShellCardHeader title={t('admin:home.quickLinksTitle')} description={t('admin:home.quickLinksDesc')} />
        <AppShellCardBody className="pt-2">
          <AdminQuickLinks />
        </AppShellCardBody>
      </AppShellCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AppShellCard className="col-span-2 lg:col-span-3">
          <AppShellCardHeader
            title={t('admin:home.snapshotTitle')}
            description={t('admin:home.snapshotDesc')}
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
    </AppPageStack>
  )
}
