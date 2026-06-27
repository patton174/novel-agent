import { ADMIN_NAV_GROUPS } from '@/config/adminNav'

export interface AdminBreadcrumbSegment {
  labelKey: string
  to?: string
}

function findNavMatch(pathname: string) {
  let best: { group: (typeof ADMIN_NAV_GROUPS)[number]; item: (typeof ADMIN_NAV_GROUPS)[number]['items'][number] } | null =
    null

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      const exact = pathname === item.to
      const nested = item.to !== '/admin' && pathname.startsWith(`${item.to}/`)
      if (!exact && !nested) continue
      if (!best || item.to.length > best.item.to.length) {
        best = { group, item }
      }
    }
  }
  return best
}

/** 根据 pathname 生成管理台面包屑（分组 + 当前页） */
export function buildAdminBreadcrumbSegments(pathname: string): AdminBreadcrumbSegment[] {
  if (pathname === '/admin') {
    return [{ labelKey: 'common:layout.admin.overviewTitle' }]
  }

  const match = findNavMatch(pathname)
  if (match) {
    return [
      { labelKey: match.group.titleKey, to: match.group.items[0]?.to },
      { labelKey: match.item.labelKey },
    ]
  }

  if (pathname === '/admin/audit-log') {
    return [
      { labelKey: 'common:nav.groupUsers', to: '/admin/users' },
      { labelKey: 'common:nav.adminAuditLog' },
    ]
  }

  return [{ labelKey: 'common:layout.admin.defaultTitle' }]
}
