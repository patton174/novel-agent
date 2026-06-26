import type { ProIconType } from '@/components/pro/IconStroke'
import {
  ProIconAdminAnalytics,
  ProIconAdminAnnouncement,
  ProIconAdminAudit,
  ProIconAdminCrawler,
  ProIconAdminJobs,
  ProIconAdminLegal,
  ProIconAdminLibrary,
  ProIconAdminMembership,
  ProIconAdminModels,
  ProIconAdminMonitoring,
  ProIconAdminOrder,
  ProIconAdminOverview,
  ProIconAdminPermission,
  ProIconAdminPlan,
  ProIconAdminPlatform,
  ProIconAdminRole,
  ProIconAdminSettings,
  ProIconAdminSitePage,
  ProIconAdminUpload,
  ProIconAdminUsers,
} from '@/components/pro/icons/proIcons'

export interface AdminNavItem {
  labelKey: string
  to: string
  icon: ProIconType
  end?: boolean
}

export interface AdminNavGroup {
  titleKey: string
  items: AdminNavItem[]
}

/** 管理后台侧栏导航（单一数据源） */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    titleKey: 'common:nav.groupOverview',
    items: [{ labelKey: 'common:nav.adminOverview', to: '/admin', icon: ProIconAdminOverview, end: true }],
  },
  {
    titleKey: 'common:nav.groupAnalytics',
    items: [{ labelKey: 'common:nav.adminAnalytics', to: '/admin/analytics', icon: ProIconAdminAnalytics }],
  },
  {
    titleKey: 'common:nav.groupBilling',
    items: [
      { labelKey: 'common:nav.adminPlans', to: '/admin/billing/plans', icon: ProIconAdminPlan },
      { labelKey: 'common:nav.adminBillingPayment', to: '/admin/billing/payment', icon: ProIconAdminPlatform },
      { labelKey: 'common:nav.adminBillingOrders', to: '/admin/billing/orders', icon: ProIconAdminOrder },
    ],
  },
  {
    titleKey: 'common:nav.groupUsers',
    items: [
      { labelKey: 'common:nav.adminUsers', to: '/admin/users', icon: ProIconAdminUsers, end: true },
      { labelKey: 'common:nav.adminUserRoles', to: '/admin/users/roles', icon: ProIconAdminRole },
      { labelKey: 'common:nav.adminUserPermissions', to: '/admin/users/permissions', icon: ProIconAdminPermission },
      { labelKey: 'common:nav.adminUserMembership', to: '/admin/users/membership', icon: ProIconAdminMembership },
      { labelKey: 'common:nav.adminAuditLog', to: '/admin/audit-log', icon: ProIconAdminAudit },
    ],
  },
  {
    titleKey: 'common:nav.groupContent',
    items: [
      { labelKey: 'common:nav.adminContentLegal', to: '/admin/content/legal', icon: ProIconAdminLegal },
      { labelKey: 'common:nav.adminContentAnnouncements', to: '/admin/content/announcements', icon: ProIconAdminAnnouncement },
      { labelKey: 'common:nav.adminContentPages', to: '/admin/content/pages', icon: ProIconAdminSitePage },
      { labelKey: 'common:nav.adminCrawler', to: '/admin/content/crawler', icon: ProIconAdminCrawler },
      { labelKey: 'common:nav.adminCatalog', to: '/admin/content/catalog', icon: ProIconAdminLibrary },
      { labelKey: 'common:nav.adminUploadOps', to: '/admin/content/uploads', icon: ProIconAdminUpload },
    ],
  },
  {
    titleKey: 'common:nav.groupSystem',
    items: [
      { labelKey: 'common:nav.adminModels', to: '/admin/system/models', icon: ProIconAdminModels },
      { labelKey: 'common:nav.adminSystemMonitoring', to: '/admin/system/monitoring', icon: ProIconAdminMonitoring },
      { labelKey: 'common:nav.adminSystemJobs', to: '/admin/system/jobs', icon: ProIconAdminJobs },
      { labelKey: 'common:nav.adminSystemSettings', to: '/admin/system/settings', icon: ProIconAdminSettings },
    ],
  },
]
