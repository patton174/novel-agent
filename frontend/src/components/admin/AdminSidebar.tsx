import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { ProSidebar, type ProSidebarGroup, type ProSidebarItem } from '@/components/pro/ProSidebar'
import { IconStroke, type ProIconType } from '@/components/pro/IconStroke'
import { NovelAiPixelWordmark } from '@/components/marketing/pixel/NovelAiPixelWordmark'
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

/** 管理后台侧栏：ProSidebar 四分组（概览/运营/内容/系统）+ 底部「返回用户端」。 */
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
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border/60 px-4">
          <NovelAiPixelWordmark size="nav" cursor={false} />
          <span className="border-2 border-foreground bg-neon px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
            ADMIN
          </span>
        </div>
      }
      footer={
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/5 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <IconStroke icon={IconArrowLeft} size={20} />
          <span>{t('common:nav.backToUser')}</span>
        </NavLink>
      }
    />
  )
}
