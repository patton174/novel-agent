import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { needsEmailVerification } from '@/api/userApi'
import { useUserStore } from '@/stores/userStore'
import { UserPixelAvatar } from '@/components/avatars/PixelAvatar'
import { PixelAvatarFrame } from '@/components/avatars/PixelAvatarFrame'

interface DashboardSidebarFooterProps {
  /** 抽屉内导航后回调（关闭抽屉） */
  onNavigate?: () => void
  /** 窄栏模式：仅显示头像 */
  collapsed?: boolean
}

/** 仪表盘侧栏底部：用户头像 + 邮箱状态 + 跳转账户设置。
 *  - 头像左上角小圆点：邮箱未验证时显示（sky-500）。
 *  - 整块为 NavLink → /dashboard/settings。 */
export function DashboardSidebarFooter({ onNavigate, collapsed = false }: DashboardSidebarFooterProps) {
  const { t } = useTranslation(['common'])
  const profile = useUserStore((s) => s.profile)
  const unverified = needsEmailVerification(profile)

  return (
    <NavLink
      to="/dashboard/settings"
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex w-full items-center rounded-xl text-left transition-colors hover:from-muted/65 hover:via-muted/40',
          collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
          'bg-gradient-to-r from-muted/50 via-muted/30 to-transparent ring-1 ring-border/40',
          isActive && 'ring-2 ring-primary/25',
        )
      }
      title={t('common:nav.dashboardSettings')}
    >
      <div className="relative shrink-0">
        <PixelAvatarFrame size={collapsed ? 36 : 40} bordered={false}>
          <UserPixelAvatar size={collapsed ? 32 : 36} animated />
        </PixelAvatarFrame>
        {unverified ? (
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-sky-500 ring-2 ring-surface" />
        ) : null}
      </div>
      {!collapsed ? (
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
      ) : null}
    </NavLink>
  )
}
