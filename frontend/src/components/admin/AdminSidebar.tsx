import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import {
  IconArrowLeft,
  IconBooks,
  IconCash,
  IconChartBar,
  IconClipboardList,
  IconCreditCard,
  IconFileText,
  IconLayoutDashboard,
  IconRobot,
  IconSettings,
  IconShield,
  IconUsers,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { ProSidebar, type ProSidebarGroup, type ProSidebarItem } from '@/components/pro/ProSidebar'
import { IconStroke, type TablerIcon } from '@/components/pro/IconStroke'

interface AdminSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

/** 管理后台侧栏：ProSidebar 四分组（概览/运营/内容/系统）+ 底部「返回用户端」。 */
export function AdminSidebar({ embedded = false, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation(['common'])

  const item = (label: string, to: string, icon: TablerIcon, end?: boolean): ProSidebarItem => ({
    label,
    to,
    icon,
    end,
  })

  const groups: ProSidebarGroup[] = [
    {
      title: t('common:nav.groupOverview'),
      items: [
        item(t('common:nav.adminOverview'), '/admin', IconLayoutDashboard, true),
        item(t('common:nav.adminStats'), '/admin/stats', IconChartBar),
      ],
    },
    {
      title: t('common:nav.groupOperations'),
      items: [
        item(t('common:nav.adminUsers'), '/admin/users', IconUsers),
        item(t('common:nav.adminPlans'), '/admin/plans', IconCreditCard),
        item(t('common:nav.adminRevenue'), '/admin/revenue', IconCash),
        item(t('common:nav.adminAuditLog'), '/admin/audit-log', IconClipboardList),
      ],
    },
    {
      title: t('common:nav.groupContent'),
      items: [
        item(t('common:nav.adminSiteContent'), '/admin/site-content', IconFileText),
        item(t('common:nav.adminCrawler'), '/admin/crawler', IconRobot),
        item(t('common:nav.adminCatalog'), '/admin/catalog', IconBooks),
      ],
    },
    {
      title: t('common:nav.groupSystem'),
      items: [item(t('common:nav.adminSystemSettings'), '/admin/system-settings', IconSettings)],
    },
  ]

  return (
    <ProSidebar
      groups={groups}
      embedded={embedded}
      onNavigate={onNavigate}
      header={
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <IconShield size={18} aria-hidden />
          </div>
          <span className="text-sm font-semibold tracking-tight">{t('common:nav.adminTitle')}</span>
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
