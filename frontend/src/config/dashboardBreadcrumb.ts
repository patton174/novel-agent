import { DASHBOARD_NAV_GROUPS } from '@/config/dashboardNav'

export interface DashboardBreadcrumbSegment {
  labelKey: string
  to?: string
}

function findNavMatch(pathname: string) {
  let best: {
    group: (typeof DASHBOARD_NAV_GROUPS)[number]
    item: (typeof DASHBOARD_NAV_GROUPS)[number]['items'][number]
  } | null = null

  for (const group of DASHBOARD_NAV_GROUPS) {
    for (const item of group.items) {
      const exact = pathname === item.to
      const nested = item.to !== '/dashboard' && pathname.startsWith(`${item.to}/`)
      if (!exact && !nested) continue
      if (!best || item.to.length > best.item.to.length) {
        best = { group, item }
      }
    }
  }
  return best
}

export function buildDashboardBreadcrumbSegments(pathname: string): DashboardBreadcrumbSegment[] {
  if (pathname === '/dashboard') {
    return [{ labelKey: 'common:layout.dashboard.overviewTitle' }]
  }

  const match = findNavMatch(pathname)
  if (match) {
    return [
      { labelKey: match.group.titleKey, to: match.group.items[0]?.to },
      { labelKey: match.item.labelKey },
    ]
  }

  return [{ labelKey: 'common:layout.dashboard.defaultTitle' }]
}
