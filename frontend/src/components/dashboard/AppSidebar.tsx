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

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface text-foreground">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <PenLine className="size-4" />
        </div>
        <span className="text-base font-bold tracking-tight">Novel Agent</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-4">
        {mainNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
            )
          }>
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        <Separator className="my-3" />

        {actionNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
            )
          }>
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        {adminNav.length > 0 && <Separator className="my-3" />}
        {adminNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
            )
          }>
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
