import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import {
  BookMarked,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { needsEmailVerification } from '@/api/userApi'
import { useUserStore } from '@/stores/userStore'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NovelAiWordmark } from '@/components/marketing/NovelAiWordmark'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

interface AppSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

export function AppSidebar({ embedded = false, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation(['common'])
  const profile = useUserStore((s) => s.profile)
  const unverified = needsEmailVerification(profile)
  const initials = profile?.username?.slice(0, 2).toUpperCase() || '?'

  const mainNav: NavItem[] = [
    { label: t('common:nav.dashboardOverview'), to: '/dashboard', icon: LayoutDashboard, end: true },
    { label: t('common:nav.dashboardNovels'), to: '/dashboard/novels', icon: BookOpen },
    { label: t('common:nav.dashboardBookstore'), to: '/dashboard/bookstore', icon: BookMarked },
    { label: t('common:nav.dashboardBilling'), to: '/dashboard/billing', icon: CreditCard },
    { label: t('common:nav.dashboardSettings'), to: '/dashboard/settings', icon: Settings },
  ]

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
      isActive
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
    )

  const shellClass = embedded
    ? 'flex h-full w-full flex-col bg-surface text-foreground'
    : 'flex h-full w-56 shrink-0 flex-col border-r border-border/80 bg-surface text-foreground lg:w-60'

  return (
    <>
      <aside className={shellClass}>
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/dashboard" className="flex min-w-0 items-center transition-opacity hover:opacity-90">
            <NovelAiWordmark size="sm" animate={false} />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
              onClick={onNavigate}
            >
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <NavLink
            to="/dashboard/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-surface-hover',
                unverified
                  ? 'border-sky-300/80 bg-sky-50/80 dark:border-sky-700/50 dark:bg-sky-950/30'
                  : 'border-border bg-background',
                isActive && 'ring-2 ring-primary/25',
              )
            }
            title={t('common:nav.dashboardSettings')}
          >
            <div className="relative shrink-0">
              <Avatar size="sm" className="size-9 rounded-full">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {unverified ? (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-sky-500 ring-2 ring-surface" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.username || t('common:nav.dashboardSettings')}
              </p>
              <p
                className={cn(
                  'truncate text-xs',
                  unverified ? 'font-medium text-sky-700 dark:text-sky-300' : 'text-muted-foreground',
                )}
              >
                {unverified ? t('common:nav.emailUnverified') : t('common:nav.dashboardSettings')}
              </p>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  )
}
