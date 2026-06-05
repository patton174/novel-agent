import { useEffect, useState } from 'react'
import { Bot, BookOpen, FileText, UserCheck, UserPlus, Users } from 'lucide-react'
import {
  fetchContentStats,
  fetchPlatformStats,
  type ContentStats,
  type PlatformStats,
} from '@/api/adminApi'
import { appToast } from '@/stores/appToastStore'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const STAT_CARDS = [
  { key: 'totalUsers', label: '总用户', icon: Users, source: 'platform' as const },
  { key: 'todayRegistrations', label: '今日注册', icon: UserPlus, source: 'platform' as const },
  { key: 'activeUsers', label: '活跃用户', icon: UserCheck, source: 'platform' as const },
  { key: 'totalNovels', label: '总小说', icon: BookOpen, source: 'content' as const },
  { key: 'totalChapters', label: '总章节', icon: FileText, source: 'content' as const },
  { key: 'totalAgentRuns', label: 'Agent 总调用', icon: Bot, source: 'content' as const },
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key} size="sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl tabular-nums">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  getStatValue(platform, content, stat.key, stat.source)!.toLocaleString('zh-CN')
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
