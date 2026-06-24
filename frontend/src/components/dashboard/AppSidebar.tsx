import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { NovelAiPixelWordmark } from '@/components/marketing/pixel/NovelAiPixelWordmark'
import { ProSidebar, type ProSidebarGroup } from '@/components/pro/ProSidebar'
import {
  ProIconAdminSystem,
  ProIconBilling,
  ProIconLibrary,
  ProIconNovel,
  ProIconOverview,
} from '@/components/pro/icons/proIcons'
import { DashboardSidebarFooter } from './DashboardSidebarFooter'

interface AppSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

/** 仪表盘侧栏：ProSidebar 薄封装（顶部 wordmark + 创作分组导航 + 底部头像/设置） */
export function AppSidebar({ embedded = false, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation(['common'])

  const groups: ProSidebarGroup[] = [
    {
      title: t('common:nav.groupCreation'),
      items: [
        { label: t('common:nav.dashboardOverview'), to: '/dashboard', icon: ProIconOverview, end: true },
        { label: t('common:nav.dashboardNovels'), to: '/dashboard/novels', icon: ProIconNovel },
        { label: t('common:nav.dashboardMyLibrary'), to: '/dashboard/my-library', icon: ProIconLibrary },
        { label: t('common:nav.dashboardBilling'), to: '/dashboard/billing', icon: ProIconBilling },
        {
          label: t('common:nav.dashboardModelConnections'),
          to: '/dashboard/settings#api-models',
          icon: ProIconAdminSystem,
        },
      ],
    },
  ]

  return (
    <ProSidebar
      groups={groups}
      embedded={embedded}
      onNavigate={onNavigate}
      header={
        <div className="flex h-12 items-center border-b border-border/60 px-3">
          <Link to="/" className="flex min-w-0 items-center overflow-hidden transition-opacity hover:opacity-90" aria-label={t('common:nav.backToHome')}>
            <NovelAiPixelWordmark size="sm" cursor={false} />
          </Link>
        </div>
      }
      footer={<DashboardSidebarFooter onNavigate={onNavigate} />}
    />
  )
}
