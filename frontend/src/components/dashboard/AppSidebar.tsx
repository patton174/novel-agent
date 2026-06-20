import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { IconBook2, IconBooks, IconCreditCard, IconLayoutDashboard } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { needsEmailVerification } from '@/api/userApi'
import { useUserStore } from '@/stores/userStore'
import { UserPixelAvatar } from '@/components/avatars/PixelAvatar'
import { PixelAvatarFrame } from '@/components/avatars/PixelAvatarFrame'
import { NovelAiWordmark } from '@/components/marketing/NovelAiWordmark'
import { ProSidebar, type ProSidebarGroup } from '@/components/pro/ProSidebar'

interface AppSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

/** 仪表盘侧栏：ProSidebar 薄封装（顶部 wordmark + 创作分组导航 + 底部头像/设置） */
export function AppSidebar({ embedded = false, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation(['common'])
  const profile = useUserStore((s) => s.profile)
  const unverified = needsEmailVerification(profile)

  const groups: ProSidebarGroup[] = [
    {
      title: t('common:nav.groupCreation'),
      items: [
        { label: t('common:nav.dashboardOverview'), to: '/dashboard', icon: IconLayoutDashboard, end: true },
        { label: t('common:nav.dashboardNovels'), to: '/dashboard/novels', icon: IconBook2 },
        { label: t('common:nav.dashboardMyLibrary'), to: '/dashboard/my-library', icon: IconBooks },
        { label: t('common:nav.dashboardBilling'), to: '/dashboard/billing', icon: IconCreditCard },
      ],
    },
  ]

  return (
    <ProSidebar
      groups={groups}
      embedded={embedded}
      onNavigate={onNavigate}
      header={
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Link to="/dashboard" className="flex min-w-0 items-center transition-opacity hover:opacity-90">
            <NovelAiWordmark size="sm" animate={false} />
          </Link>
        </div>
      }
      footer={
        <NavLink
          to="/dashboard/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:from-muted/65 hover:via-muted/40',
              'bg-gradient-to-r from-muted/50 via-muted/30 to-transparent ring-1 ring-border/40',
              isActive && 'ring-2 ring-primary/25',
            )
          }
          title={t('common:nav.dashboardSettings')}
        >
          <div className="relative shrink-0">
            <PixelAvatarFrame size={40}>
              <UserPixelAvatar size={36} animated />
            </PixelAvatarFrame>
            {unverified ? (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-sky-500 ring-2 ring-surface" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {profile?.username || t('common:nav.dashboardSettings')}
            </p>
            <p
              className={cn(
                'mt-0.5 truncate text-xs',
                unverified ? 'font-medium text-sky-700 dark:text-sky-300' : 'text-muted-foreground',
              )}
            >
              {unverified
                ? t('common:nav.emailUnverified')
                : profile?.email?.trim() || t('common:nav.dashboardSettings')}
            </p>
          </div>
        </NavLink>
      }
    />
  )
}
