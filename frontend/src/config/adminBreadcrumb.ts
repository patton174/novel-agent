import { ADMIN_NAV_GROUPS } from '@/config/adminNav'

export interface AdminBreadcrumbSegment {
  labelKey: string
  to?: string
}

/** 根据 pathname 生成管理台面包屑（分组 + 当前页） */
export function buildAdminBreadcrumbSegments(pathname: string): AdminBreadcrumbSegment[] {
  if (pathname === '/admin') {
    return [{ labelKey: 'common:layout.admin.overviewTitle' }]
  }

  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((entry) => entry.to === pathname)
    if (item) {
      return [
        { labelKey: group.titleKey, to: group.items[0]?.to },
        { labelKey: item.labelKey },
      ]
    }
  }

  if (pathname === '/admin/audit-log') {
    return [
      { labelKey: 'common:nav.groupUsers', to: '/admin/users' },
      { labelKey: 'common:nav.adminAuditLog' },
    ]
  }

  return [{ labelKey: 'common:layout.admin.defaultTitle' }]
}
