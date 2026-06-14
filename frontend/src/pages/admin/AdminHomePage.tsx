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

const STAT_CARDS = [
  {
    key: 'totalUsers',
    label: '总用户',
    icon: Users,
    source: 'platform' as const,
    iconClassName: 'text-blue-600',
    iconBgClassName: 'bg-blue-500/10',
  },
  {
    key: 'todayRegistrations',
    label: '今日注册',
    icon: UserPlus,
    source: 'platform' as const,
    iconClassName: 'text-emerald-600',
    iconBgClassName: 'bg-emerald-500/10',
  },
  {
    key: 'activeUsers',
    label: '活跃用户',
    icon: UserCheck,
    source: 'platform' as const,
    iconClassName: 'text-violet-600',
    iconBgClassName: 'bg-violet-500/10',
  },
  {
    key: 'totalNovels',
    label: '总小说',
    icon: BookOpen,
    source: 'content' as const,
    iconClassName: 'text-amber-600',
    iconBgClassName: 'bg-amber-500/10',
  },
  {
    key: 'totalChapters',
    label: '总章节',
    icon: FileText,
    source: 'content' as const,
    iconClassName: 'text-cyan-600',
    iconBgClassName: 'bg-cyan-500/10',
  },
  {
    key: 'totalAgentRuns',
    label: 'Agent 总调用',
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

export default function AdminHomePage() {
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [content, setContent] = useState<ContentStats | null>(null)

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
        appToast.error(err instanceof Error ? err.message : '加载统计数据失败')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loading = platform === null || content === null

  return (
    <AppPageStack className="gap-5">
      <AppShellCard>
        <AppShellCardHeader title="快捷入口" description="常用管理功能" />
        <AppShellCardBody className="pt-2">
          <AdminQuickLinks />
        </AppShellCardBody>
      </AppShellCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AppShellCard className="col-span-2 lg:col-span-3">
          <AppShellCardHeader
            title="平台快照"
            description="当前累计指标；趋势见「平台统计」，Token 成本见「收入与成本」"
          />
        </AppShellCard>
        {STAT_CARDS.map((stat) => (
          <AppStatCard
            key={stat.key}
            label={stat.label}
            icon={stat.icon}
            iconClassName={stat.iconClassName}
            iconBgClassName={stat.iconBgClassName}
            loading={loading}
            value={getStatValue(platform, content, stat.key, stat.source)!.toLocaleString('zh-CN')}
          />
        ))}
      </div>
    </AppPageStack>
  )
}
