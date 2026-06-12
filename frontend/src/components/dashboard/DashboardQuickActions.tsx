import { Link } from 'react-router-dom'
import { PenLine, Shield } from 'lucide-react'
import { useUserStore } from '@/stores/userStore'
import { Button } from '@/components/ui/button'

export function DashboardQuickActions() {
  const profile = useUserStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex shrink-0 items-center gap-2">
      {isAdmin ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden h-9 gap-1.5 rounded-lg border-border/80 bg-background/80 px-3 text-xs font-medium sm:inline-flex"
        >
          <Link to="/admin">
            <Shield className="size-3.5" />
            管理后台
          </Link>
        </Button>
      ) : null}
      <Button asChild size="sm" className="h-9 gap-1.5 rounded-lg px-4 text-xs font-semibold">
        <Link to="/editor">
          <PenLine className="size-3.5" />
          进入编辑器
        </Link>
      </Button>
    </div>
  )
}
