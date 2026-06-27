import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { NovelAiPixelWordmark } from '@/components/marketing/pixel/NovelAiPixelWordmark'
import { DASHBOARD_NAV_GROUPS } from '@/config/dashboardNav'
import { cn } from '@/lib/utils'
import { ProSidebar } from '@/components/pro/ProSidebar'
import { DashboardSidebarFooter } from './DashboardSidebarFooter'

interface AppSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

/** 仪表盘侧栏：按模块分区展示，子项常显；不做整栏折叠（管理台保留）。 */
export function AppSidebar({ embedded = false, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation(['common'])

  const groups = DASHBOARD_NAV_GROUPS.map((group) => ({
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
      collapsed={false}
      onNavigate={onNavigate}
      header={
        <div
          className={cn(
            'flex h-12 items-center gap-2 border-b-2 border-black bg-background px-3 transition-[padding] duration-300 ease-in-out',
          )}
        >
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center overflow-hidden transition-opacity hover:opacity-90"
            aria-label={t('common:nav.backToHome')}
            onClick={onNavigate}
          >
            <NovelAiPixelWordmark size="sm" cursor={false} />
          </Link>
        </div>
      }
      footer={<DashboardSidebarFooter onNavigate={onNavigate} collapsed={false} />}
    />
  )
}
