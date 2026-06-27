import type { ProIconType } from '@/components/pro/IconStroke'
import { FEATURE_AGENT_CREW, FEATURE_AGENT_SKILLS } from '@/config/features'
import {
  ProIconAdminAnalytics,
  ProIconAdminAnnouncement,
  ProIconAdminAudit,
  ProIconAdminContent,
  ProIconAdminCoupon,
  ProIconAdminInventory,
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
  ProIconAdminProduct,
  ProIconAdminRevenue,
  ProIconAdminRole,
  ProIconAdminSettings,
  ProIconAdminSitePage,
  ProIconAdminStats,
  ProIconAdminSystem,
  ProIconAdminUpload,
  ProIconAdminUsers,
  ProIconAccount,
  ProIconBilling,
  ProIconMonitor,
} from '@/components/pro/icons/proIcons'

export interface AdminNavItem {
  labelKey: string
  to: string
  icon: ProIconType
  end?: boolean
}

export interface AdminNavGroup {
  titleKey: string
  icon: ProIconType
  items: AdminNavItem[]
  hideTitle?: boolean
}

/** 管理后台侧栏导航（单一数据源） */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    titleKey: 'common:nav.groupOverview',
    icon: ProIconAdminOverview,
    hideTitle: true,
    items: [{ labelKey: 'common:nav.adminOverview', to: '/admin', icon: ProIconAdminOverview, end: true }],
  },
  {
    titleKey: 'common:nav.groupAnalytics',
    icon: ProIconMonitor,
    items: [
      { labelKey: 'admin:analytics.tabPlatform', to: '/admin/analytics/platform', icon: ProIconAdminAnalytics },
      { labelKey: 'admin:analytics.tabRevenue', to: '/admin/analytics/revenue', icon: ProIconAdminRevenue },
      { labelKey: 'admin:analytics.tabContent', to: '/admin/analytics/content', icon: ProIconAdminStats },
    ],
  },
  {
    titleKey: 'common:nav.groupBilling',
    icon: ProIconAdminInventory,
    items: [
      { labelKey: 'common:nav.adminBillingCdk', to: '/admin/billing/cdk', icon: ProIconAdminCoupon, end: true },
      { labelKey: 'common:nav.adminBillingApprove', to: '/admin/billing/approve', icon: ProIconAdminAudit, end: true },
      { labelKey: 'common:nav.adminBillingBalance', to: '/admin/billing/balance', icon: ProIconBilling, end: true },
      { labelKey: 'common:nav.adminBillingOverage', to: '/admin/billing/overage', icon: ProIconAdminPlatform, end: true },
      { labelKey: 'common:nav.adminPlans', to: '/admin/billing/plans', icon: ProIconAdminPlan, end: true },
      { labelKey: 'common:nav.adminBillingPayment', to: '/admin/billing/payment', icon: ProIconAdminProduct, end: true },
      { labelKey: 'common:nav.adminBillingOrders', to: '/admin/billing/orders', icon: ProIconAdminOrder, end: true },
      { labelKey: 'common:nav.adminReferrals', to: '/admin/billing/referrals', icon: ProIconAdminRevenue, end: true },
      { labelKey: 'common:nav.adminGiftCampaigns', to: '/admin/billing/gift-campaigns', icon: ProIconAdminMembership, end: true },
    ],
  },
  {
    titleKey: 'common:nav.groupUsers',
    icon: ProIconAccount,
    items: [
      { labelKey: 'common:nav.adminUsers', to: '/admin/users', icon: ProIconAdminUsers, end: true },
      { labelKey: 'common:nav.adminUserRoles', to: '/admin/users/roles', icon: ProIconAdminRole, end: true },
      { labelKey: 'common:nav.adminUserPermissions', to: '/admin/users/permissions', icon: ProIconAdminPermission, end: true },
      { labelKey: 'common:nav.adminUserMembership', to: '/admin/users/membership', icon: ProIconAdminMembership, end: true },
      { labelKey: 'common:nav.adminInviteCodes', to: '/admin/users/invite-codes', icon: ProIconAdminPlatform, end: true },
      { labelKey: 'common:nav.adminAuditLog', to: '/admin/audit-log', icon: ProIconAdminAudit, end: true },
    ],
  },
  {
    titleKey: 'common:nav.groupContent',
    icon: ProIconAdminContent,
    items: [
      { labelKey: 'common:nav.adminContentLegal', to: '/admin/content/legal', icon: ProIconAdminLegal, end: true },
      { labelKey: 'common:nav.adminContentAnnouncements', to: '/admin/content/announcements', icon: ProIconAdminAnnouncement, end: true },
      { labelKey: 'notification:broadcast.nav', to: '/admin/notification', icon: ProIconAdminMonitoring, end: true },
      { labelKey: 'common:nav.adminContentPages', to: '/admin/content/pages', icon: ProIconAdminSitePage, end: true },
      { labelKey: 'common:nav.adminCatalog', to: '/admin/content/catalog', icon: ProIconAdminLibrary, end: true },
      { labelKey: 'common:nav.adminUploadOps', to: '/admin/content/uploads', icon: ProIconAdminUpload, end: true },
    ],
  },
  {
    titleKey: 'common:nav.groupSystem',
    icon: ProIconAdminSystem,
    items: [
      { labelKey: 'common:nav.adminModels', to: '/admin/system/models', icon: ProIconAdminModels, end: true },
      ...(FEATURE_AGENT_SKILLS
        ? [
            {
              labelKey: 'common:nav.adminAgentSkills',
              to: '/admin/system/agent-skills',
              icon: ProIconAdminJobs,
              end: true,
            },
          ]
        : []),
      ...(FEATURE_AGENT_CREW
        ? [
            {
              labelKey: 'common:nav.adminCrewTemplates',
              to: '/admin/system/crews',
              icon: ProIconAdminJobs,
              end: true,
            },
          ]
        : []),
      { labelKey: 'common:nav.adminSystemMonitoring', to: '/admin/system/monitoring', icon: ProIconAdminMonitoring, end: true },
      { labelKey: 'common:nav.adminSystemJobs', to: '/admin/system/jobs', icon: ProIconAdminJobs, end: true },
      { labelKey: 'common:nav.adminSystemSettings', to: '/admin/system/settings', icon: ProIconAdminSettings, end: true },
    ],
  },
]
