import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserStore } from '@/stores/userStore'

const ROLE_LABELS: Record<string, string> = {
  user: '普通用户',
  vip: 'VIP 用户',
  admin: '管理员',
}

export default function SettingsPage() {
  const profile = useUserStore((s) => s.profile)

  if (!profile) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>账户信息</CardTitle>
        <CardDescription>当前登录用户的基本资料</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">用户名</span>
          <span className="text-sm font-medium">{profile.username || '—'}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">邮箱</span>
          <span className="text-sm font-medium">{profile.email || '—'}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">角色</span>
          <Badge variant="secondary">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
        </div>
        {profile.emailVerified != null ? (
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">邮箱验证</span>
            <Badge variant={profile.emailVerified ? 'default' : 'outline'}>
              {profile.emailVerified ? '已验证' : '未验证'}
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
