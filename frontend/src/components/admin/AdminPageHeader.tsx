import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { ProBreadcrumb, type BreadcrumbItem } from '@/components/pro/ProBreadcrumb'
import { buildAdminBreadcrumbSegments } from '@/config/adminBreadcrumb'
import { resolveMetaForPath } from '@/config/routeDocumentMeta'
import { cn } from '@/lib/utils'

export interface AdminPageHeaderProps {
  className?: string
  eyebrow?: string
  title?: ReactNode
  action?: ReactNode
}

/** 管理台页面顶栏：面包屑 + AdminPageHero */
export function AdminPageHeader({ className, eyebrow, title, action }: AdminPageHeaderProps) {
  const { t } = useTranslation(['common', 'admin'])
  const { pathname } = useLocation()
  const metaKeys = resolveMetaForPath(pathname)
  const resolvedEyebrow = eyebrow ?? t(metaKeys.titleKey)
  const resolvedTitle = title ?? (metaKeys.descriptionKey ? t(metaKeys.descriptionKey) : resolvedEyebrow)

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('common:nav.adminTitle'), to: '/admin' },
    ...buildAdminBreadcrumbSegments(pathname).map((segment, index, arr) => ({
      label: t(segment.labelKey),
      to: index < arr.length - 1 ? segment.to : undefined,
    })),
  ]

  return (
    <div className={cn('mb-6 flex flex-col gap-4 md:mb-8', className)}>
      <ProBreadcrumb items={breadcrumbItems} />
      <AdminPageHero eyebrow={resolvedEyebrow} title={resolvedTitle} action={action} />
    </div>
  )
}