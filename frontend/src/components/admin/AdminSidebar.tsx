import { NavLink } from 'react-router-dom'
import { ArrowLeft, BarChart3, BookOpen, Bot, LayoutDashboard, Shield, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const mainNav: NavItem[] = [
  { label: '概览', to: '/admin', icon: LayoutDashboard, end: true },
  { label: '用户管理', to: '/admin/users', icon: Users },
  { label: '平台统计', to: '/admin/stats', icon: BarChart3 },
  { label: 'AI 爬虫', to: '/admin/crawler', icon: Bot },
  { label: '书库', to: '/admin/catalog', icon: BookOpen },
]

export function AdminSidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
    )

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">管理后台</span>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {mainNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        <Separator className="my-2" />

        <NavLink to="/dashboard" className={linkClass}>
          <ArrowLeft className="size-4 shrink-0" />
          返回用户端
        </NavLink>
      </nav>
    </aside>
  )
}
