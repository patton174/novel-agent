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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-8 shadow-sm z-10">
      <div>
        <h1 className="text-lg font-bold leading-none text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        {profile?.role === 'admin' ? (
          <Badge variant="secondary" className="rounded-full px-3">管理员</Badge>
        ) : profile?.role === 'vip' ? (
          <Badge variant="default" className="rounded-full px-3 bg-gradient-to-r from-amber-400 to-amber-600 text-white border-none">VIP</Badge>
        ) : null}
        <div className="flex items-center gap-3 bg-background border border-border rounded-full py-1.5 px-2 hover:shadow-sm transition-shadow cursor-pointer">
          <span className="hidden text-sm font-medium text-foreground sm:inline pl-2">
            {profile?.username || '用户'}
          </span>
          <Avatar size="sm" className="w-8 h-8 rounded-full">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
