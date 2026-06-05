import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useUserStore } from '@/stores/userStore'

interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const profile = useUserStore((s) => s.profile)
  const initials = profile?.username?.slice(0, 2).toUpperCase() || '?'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
      <div>
        <h1 className="text-base font-semibold leading-none">{title}</h1>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {profile?.role === 'admin' ? (
          <Badge variant="secondary">管理员</Badge>
        ) : profile?.role === 'vip' ? (
          <Badge variant="secondary">VIP</Badge>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {profile?.username || '用户'}
          </span>
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
