import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  LayoutDashboard,
  PenLine,
  Settings,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/userStore'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
  external?: boolean
}

const mainNav: NavItem[] = [
  { label: '概览', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: '我的小说', to: '/dashboard/novels', icon: BookOpen },
  { label: '账户设置', to: '/dashboard/settings', icon: Settings },
]

const actionNav: NavItem[] = [
  { label: '进入编辑器', to: '/editor', icon: PenLine, external: true },
]

export function AppSidebar() {
  const role = useUserStore((s) => s.profile?.role)
  const adminNav: NavItem[] =
    role === 'admin'
      ? [{ label: '管理后台', to: '/admin', icon: Shield, external: true }]
      : []

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
          <PenLine className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Novel AI</span>
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

        {actionNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        {adminNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
