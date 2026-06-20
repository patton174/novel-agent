import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { IconBook2, IconBooks, IconCreditCard, IconLayoutDashboard } from '@tabler/icons-react'
import { NovelAiWordmark } from '@/components/marketing/NovelAiWordmark'
import { ProSidebar, type ProSidebarGroup } from '@/components/pro/ProSidebar'
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
      footer={<DashboardSidebarFooter onNavigate={onNavigate} />}
    />
  )
}
