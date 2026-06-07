import { useCallback, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  BookMarked,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  PenLine,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchUserInfo, needsEmailVerification } from '@/api/userApi'
import { useUserStore } from '@/stores/userStore'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AccountSettingsModal } from '@/components/dashboard/AccountSettingsModal'
import { NovelAiWordmark } from '@/components/marketing/NovelAiWordmark'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const mainNav: NavItem[] = [
  { label: '概览', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: '我的小说', to: '/dashboard/novels', icon: BookOpen },
  { label: '书库', to: '/dashboard/bookstore', icon: BookMarked },
  { label: '用量与账单', to: '/dashboard/billing', icon: CreditCard },
]

const actionNav: NavItem[] = [
  { label: '进入编辑器', to: '/editor', icon: PenLine },
]

interface AppSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

export function AppSidebar({ embedded = false, onNavigate }: AppSidebarProps) {
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const role = profile?.role
  const adminNav: NavItem[] =
    role === 'admin' ? [{ label: '管理后台', to: '/admin', icon: Shield }] : []

  const initials = profile?.username?.slice(0, 2).toUpperCase() || '?'
  const unverified = needsEmailVerification(profile)

  const refreshProfile = useCallback(() => {
    void fetchUserInfo()
      .then(setProfile)
      .catch(() => {
        /* ignore */
      })
  }, [setProfile])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
      isActive
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
    )

  const shellClass = embedded
    ? 'flex h-full w-full flex-col bg-surface text-foreground'
    : 'flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface text-foreground'

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

          <Separator className="my-3" />

          {actionNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={onNavigate}>
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {adminNav.length > 0 && <Separator className="my-3" />}
          {adminNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={onNavigate}>
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-surface-hover',
              unverified
                ? 'border-amber-300/80 bg-amber-50/80 dark:border-amber-700/50 dark:bg-amber-950/30'
                : 'border-border bg-background',
            )}
          >
            <div className="relative shrink-0">
              <Avatar size="sm" className="size-9 rounded-full">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {unverified ? (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-surface" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.username || '账户设置'}
              </p>
              <p
                className={cn(
                  'truncate text-xs',
                  unverified ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-muted-foreground',
                )}
              >
                {unverified ? '邮箱未验证 · 点击设置' : '账户设置'}
              </p>
            </div>
          </button>
        </div>
      </aside>

      <AccountSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        profile={profile}
        onProfileRefresh={refreshProfile}
      />
    </>
  )
}
