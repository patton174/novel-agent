import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function AdminQuickLinks() {
  const { t } = useTranslation(['common'])

  const QUICK_LINKS = [
    { to: '/admin/analytics/platform', label: t('common:nav.adminAnalytics') },
    { to: '/admin/users', label: t('common:nav.adminUsers') },
    { to: '/admin/billing/plans', label: t('common:nav.adminPlans') },
    { to: '/admin/billing/payment', label: t('common:nav.adminBillingPayment') },
    { to: '/admin/billing/orders', label: t('common:nav.adminBillingOrders') },
    { to: '/admin/content/legal', label: t('common:nav.adminContentLegal') },
    { to: '/admin/content/catalog', label: t('common:nav.adminCatalog') },
    { to: '/admin/system/monitoring', label: t('common:nav.adminSystemMonitoring') },
  ] as const

  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_LINKS.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          {label}
          <ArrowRight className="size-3 opacity-60" />
        </Link>
      ))}
    </div>
  )
}
