import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function AdminQuickLinks() {
  const { t } = useTranslation(['common'])

  const QUICK_LINKS = [
    { to: '/admin/stats', label: t('common:nav.adminStats') },
    { to: '/admin/users', label: t('common:nav.adminUsers') },
    { to: '/admin/products', label: t('common:nav.adminProducts') },
    { to: '/admin/plans', label: t('common:nav.adminPlans') },
    { to: '/admin/payment-orders', label: t('common:nav.adminPaymentOrders') },
    { to: '/admin/revenue', label: t('common:nav.adminRevenue') },
    { to: '/admin/crawler', label: t('common:nav.adminCrawler') },
    { to: '/admin/site-content', label: t('common:nav.adminSiteContent') },
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
