import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { ArrowLeft, BarChart3, BookOpen, Bot, CreditCard, DollarSign, FileText, LayoutDashboard, ScrollText, Settings, Shield, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

interface AdminSidebarProps {
  embedded?: boolean
  onNavigate?: () => void
}

export function AdminSidebar({ embedded = false, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation(['admin', 'common'])

  const mainNav: NavItem[] = [
    { label: t('common:nav.adminOverview'), to: '/admin', icon: LayoutDashboard, end: true },
    { label: t('common:nav.adminUsers'), to: '/admin/users', icon: Users },
    { label: t('common:nav.adminPlans'), to: '/admin/plans', icon: CreditCard },
    { label: t('common:nav.adminRevenue'), to: '/admin/revenue', icon: DollarSign },
    { label: t('common:nav.adminSiteContent'), to: '/admin/site-content', icon: FileText },
    { label: t('common:nav.adminAuditLog'), to: '/admin/audit-log', icon: ScrollText },
    { label: t('common:nav.adminSystemSettings'), to: '/admin/system-settings', icon: Settings },
    { label: t('common:nav.adminStats'), to: '/admin/stats', icon: BarChart3 },
    { label: t('common:nav.adminCrawler'), to: '/admin/crawler', icon: Bot },
    { label: t('common:nav.adminCatalog'), to: '/admin/catalog', icon: BookOpen },
  ]
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
    )

  const shellClass = embedded
    ? 'flex h-full w-full flex-col bg-sidebar text-sidebar-foreground'
    : 'flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground'

  return (
    <aside className={shellClass}>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{t('common:nav.adminTitle')}</span>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {mainNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onNavigate}>
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        <Separator className="my-2" />

        <NavLink to="/dashboard" className={linkClass} onClick={onNavigate}>
          <ArrowLeft className="size-4 shrink-0" />
          {t('common:nav.backToUser')}
        </NavLink>
      </nav>
    </aside>
  )
}
