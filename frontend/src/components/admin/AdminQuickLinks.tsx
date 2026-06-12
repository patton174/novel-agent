import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/** 管理概览页快捷入口 */
const QUICK_LINKS = [
  { to: '/admin/users', label: '用户管理' },
  { to: '/admin/crawler', label: 'AI 爬虫' },
  { to: '/admin/plans', label: '套餐管理' },
  { to: '/admin/revenue', label: '收入与成本' },
  { to: '/admin/stats', label: '平台统计' },
  { to: '/admin/site-content', label: '站点内容' },
] as const

export function AdminQuickLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_LINKS.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          {label}
          <ArrowRight className="size-3 opacity-60" />
        </Link>
      ))}
    </div>
  )
}
