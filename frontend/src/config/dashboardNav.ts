import type { ProIconType } from '@/components/pro/IconStroke'
import {
  ProIconAccount,
  ProIconAdminAnalytics,
  ProIconAdminAnnouncement,
  ProIconAdminModels,
  ProIconAdminRevenue,
  ProIconBilling,
  ProIconLanguage,
  ProIconLibrary,
  ProIconNovel,
  ProIconOverview,
  ProIconPencil,
  ProIconSettings,
  ProIconAdminContent,
} from '@/components/pro/icons/proIcons'
import { SETTINGS_SECTIONS } from '@/pages/dashboard/settings/settingsSections'
import { FEATURE_AGENT_CREW, FEATURE_AGENT_SKILLS } from '@/config/features'

export interface DashboardNavItem {
  labelKey: string
  to: string
  icon: ProIconType
  end?: boolean
}

export interface DashboardNavGroup {
  titleKey: string
  icon: ProIconType
  items: DashboardNavItem[]
  hideTitle?: boolean
}

const SETTINGS_NAV_ITEMS: DashboardNavItem[] = [
  {
    labelKey: 'common:nav.dashboardSettingsProfile',
    to: '/dashboard/settings/profile',
    icon: ProIconAccount,
    end: true,
  },
  {
    labelKey: 'common:nav.dashboardModelConnections',
    to: '/dashboard/settings/models',
    icon: ProIconAdminModels,
    end: true,
  },
  {
    labelKey: 'common:nav.dashboardSettingsPreferences',
    to: '/dashboard/settings/preferences',
    icon: ProIconLanguage,
    end: true,
  },
  {
    labelKey: 'common:nav.dashboardSettingsReferral',
    to: '/dashboard/settings/referral',
    icon: ProIconAdminRevenue,
    end: true,
  },
  {
    labelKey: 'common:nav.dashboardSettingsFeedback',
    to: '/dashboard/settings/feedback',
    icon: ProIconAdminAnnouncement,
    end: true,
  },
]

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    titleKey: 'common:nav.groupOverview',
    icon: ProIconOverview,
    hideTitle: true,
    items: [{ labelKey: 'common:nav.dashboardOverview', to: '/dashboard', icon: ProIconOverview, end: true }],
  },
  {
    titleKey: 'common:nav.groupCreation',
    icon: ProIconPencil,
    items: [
      { labelKey: 'common:nav.dashboardNovels', to: '/dashboard/novels', icon: ProIconNovel, end: true },
      { labelKey: 'common:nav.dashboardMyLibrary', to: '/dashboard/my-library', icon: ProIconLibrary, end: true },
      ...(FEATURE_AGENT_SKILLS
        ? [
            {
              labelKey: 'common:nav.dashboardSkills',
              to: '/dashboard/skills',
              icon: ProIconAdminContent,
              end: true,
            },
          ]
        : []),
      ...(FEATURE_AGENT_CREW
        ? [
            {
              labelKey: 'common:nav.dashboardAgentProfiles',
              to: '/dashboard/agent/profiles',
              icon: ProIconAdminModels,
              end: true,
            },
          ]
        : []),
    ],
  },
  {
    titleKey: 'common:nav.groupAccount',
    icon: ProIconBilling,
    items: [
      { labelKey: 'common:nav.dashboardMyBills', to: '/dashboard/billing', icon: ProIconBilling, end: true },
      { labelKey: 'common:nav.dashboardUsageDetails', to: '/dashboard/usage', icon: ProIconAdminAnalytics, end: true },
    ],
  },
  {
    titleKey: 'common:nav.groupSettings',
    icon: ProIconSettings,
    items: SETTINGS_NAV_ITEMS,
  },
]

/** 供路由校验与文档 meta 使用 */
export const DASHBOARD_SETTINGS_PATHS = SETTINGS_SECTIONS.map(
  (section) => `/dashboard/settings/${section}`,
)
