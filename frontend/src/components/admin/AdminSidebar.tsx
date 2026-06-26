import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { PixelIcons } from '@/components/icons/PixelIcons'
import { ADMIN_NAV_GROUPS } from '@/config/adminNav'
import { useAdminSidebarCollapsed } from '@/hooks/useAdminSidebarCollapsed'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { ProSidebar } from '@/components/pro/ProSidebar'
import { DashboardSidebarFooter } from '@/components/dashboard/DashboardSidebarFooter'

interface AdminSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

export function AdminSidebar({ embedded = false, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation(['common'])
  const { collapsed, toggle } = useAdminSidebarCollapsed()
  const narrow = collapsed && !embedded

  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    title: t(group.titleKey),
    items: group.items.map((item) => ({
      label: t(item.labelKey),
      to: item.to,
      icon: item.icon,
      end: item.end,
    })),
  }))

  return (
    <ProSidebar
      groups={groups}
      embedded={embedded}
      collapsed={collapsed}
      onToggleCollapse={embedded ? undefined : toggle}
      onNavigate={onNavigate}
      header={
        <div
          className={cn(
            'flex h-12 items-center gap-2 border-b-2 border-black bg-background',
            narrow ? 'justify-center px-1.5' : 'px-3',
            embedded && !narrow && 'pr-3',
          )}
        >
          {!narrow ? (
            <NavLink
              to="/dashboard"
              onClick={onNavigate}
              className={cn(editorPixelIconButtonClass(), 'text-foreground')}
              aria-label={t('common:nav.backToUser')}
              title={t('common:nav.backToUser')}
            >
              <PixelIcons.ArrowLeft />
            </NavLink>
          ) : null}
          {!narrow ? (
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-black uppercase tracking-tight text-foreground">
                {t('common:nav.adminTitle')}
              </p>
            </div>
          ) : null}
          {!embedded && !narrow ? (
            <span className="shrink-0 border-2 border-foreground bg-neon px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-ink shadow-[1px_1px_0_0_var(--foreground)]">
              Admin
            </span>
          ) : null}
        </div>
      }
      footer={<DashboardSidebarFooter onNavigate={onNavigate} collapsed={narrow} />}
    />
  )
}
