import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronRight } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface ProBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function ProBreadcrumb({ items, className }: ProBreadcrumbProps) {
  const { t } = useTranslation('common')
  return (
    <nav aria-label={t('a11y.breadcrumb')} className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <Fragment key={i}>
            {item.to && !last ? (
              <Link to={item.to} className="transition-colors hover:text-foreground">{item.label}</Link>
            ) : (
              <span className={cn(last && 'text-foreground font-medium')}>{item.label}</span>
            )}
            {!last ? <IconChevronRight size={14} stroke={2} className="text-muted-foreground/60" aria-hidden="true" /> : null}
          </Fragment>
        )
      })}
    </nav>
  )
}
