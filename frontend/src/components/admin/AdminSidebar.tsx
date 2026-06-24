import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { PixelIcons } from '@/components/icons/PixelIcons'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { ProSidebar, type ProSidebarGroup, type ProSidebarItem } from '@/components/pro/ProSidebar'
import { type ProIconType } from '@/components/pro/IconStroke'
import { DashboardSidebarFooter } from '@/components/dashboard/DashboardSidebarFooter'
import {
  ProIconAdminAudit,
  ProIconAdminContent,
  ProIconAdminCrawler,
  ProIconAdminLibrary,
  ProIconAdminOverview,
  ProIconAdminPlan,
  ProIconAdminRevenue,
  ProIconAdminStats,
  ProIconAdminSystem,
  ProIconAdminUsers,
} from '@/components/pro/icons/proIcons'

interface AdminSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

/** 管理后台侧栏：ProSidebar 四分组 + 顶部返回 + 底部用户卡。 */
export function AdminSidebar({ embedded = false, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation(['common'])

  const item = (label: string, to: string, icon: ProIconType, end?: boolean): ProSidebarItem => ({
    label,
    to,
    icon,
    end,
  })

  const groups: ProSidebarGroup[] = [
    {
      title: t('common:nav.groupOverview'),
      items: [
        item(t('common:nav.adminOverview'), '/admin', ProIconAdminOverview, true),
        item(t('common:nav.adminStats'), '/admin/stats', ProIconAdminStats),
      ],
    },
    {
      title: t('common:nav.groupOperations'),
      items: [
        item(t('common:nav.adminUsers'), '/admin/users', ProIconAdminUsers),
        item(t('common:nav.adminPlans'), '/admin/plans', ProIconAdminPlan),
        item(t('common:nav.adminModels'), '/admin/models', ProIconAdminSystem),
        item(t('common:nav.adminRevenue'), '/admin/revenue', ProIconAdminRevenue),
        item(t('common:nav.adminAuditLog'), '/admin/audit-log', ProIconAdminAudit),
      ],
    },
    {
      title: t('common:nav.groupContent'),
      items: [
        item(t('common:nav.adminSiteContent'), '/admin/site-content', ProIconAdminContent),
        item(t('common:nav.adminCrawler'), '/admin/crawler', ProIconAdminCrawler),
        item(t('common:nav.adminCatalog'), '/admin/catalog', ProIconAdminLibrary),
      ],
    },
    {
      title: t('common:nav.groupSystem'),
      items: [item(t('common:nav.adminSystemSettings'), '/admin/system-settings', ProIconAdminSystem)],
    },
  ]

  return (
    <ProSidebar
      groups={groups}
      embedded={embedded}
      onNavigate={onNavigate}
      header={
        <div
          className={cn(
            'flex h-12 items-center gap-2 border-b-2 border-black bg-background px-3',
            embedded && 'pr-3',
          )}
        >
          <NavLink
            to="/dashboard"
            onClick={onNavigate}
            className={cn(editorPixelIconButtonClass(), 'text-foreground')}
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
          {!embedded ? (
            <span className="shrink-0 border-2 border-foreground bg-neon px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-ink shadow-[1px_1px_0_0_var(--foreground)]">
              Admin
            </span>
          ) : null}
        </div>
      }
      footer={<DashboardSidebarFooter onNavigate={onNavigate} />}
    />
  )
}
