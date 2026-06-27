import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { PixelIcons } from '@/components/icons/PixelIcons'
import { ADMIN_NAV_GROUPS } from '@/config/adminNav'
import { useAdminSidebarCollapsed } from '@/hooks/useAdminSidebarCollapsed'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { AdminSidebarToggle } from '@/components/admin/AdminSidebarToggle'
import { ProSidebar } from '@/components/pro/ProSidebar'
import { DashboardSidebarFooter } from '@/components/dashboard/DashboardSidebarFooter'

interface AdminSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

export function AdminSidebar({ embedded = false, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation(['common', 'admin'])
  const { collapsed } = useAdminSidebarCollapsed()
  const narrow = collapsed && !embedded

  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    id: group.titleKey,
    title: t(group.titleKey),
    icon: group.icon,
    hideTitle: group.hideTitle,
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
      collapsibleGroups
      groupExpandMode="accordion"
      navExpandedStorageKey="novel-admin-nav-expanded"
      onNavigate={onNavigate}
      header={
        <div
          className={cn(
            'flex h-12 items-center gap-2 border-b-2 border-black bg-background transition-[padding] duration-300 ease-in-out',
            narrow ? 'justify-center px-1.5' : 'px-3',
            embedded && !narrow && 'pr-3',
          )}
        >
          {narrow ? (
            <AdminSidebarToggle />
          ) : (
            <>
              <NavLink
                to="/dashboard"
                onClick={onNavigate}
                className={cn(editorPixelIconButtonClass(), 'shrink-0 text-foreground')}
                aria-label={t('common:nav.backToUser')}
                title={t('common:nav.backToUser')}
              >
                <PixelIcons.ArrowLeft />
              </NavLink>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-black uppercase tracking-tight text-foreground">
                  {t('common:nav.adminTitle')}
                </p>
              </div>
              <span className="shrink-0 border-2 border-foreground bg-neon px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-ink shadow-[1px_1px_0_0_var(--foreground)]">
                {t('admin:common.adminBadge')}
              </span>
              {!embedded ? <AdminSidebarToggle /> : null}
            </>
          )}
        </div>
      }
      footer={<DashboardSidebarFooter onNavigate={onNavigate} collapsed={narrow} />}
    />
  )
}
