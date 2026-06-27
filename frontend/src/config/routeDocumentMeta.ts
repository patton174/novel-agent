/** i18n keys for document title (and optional description). Namespace included, e.g. `common:layout.dashboard.overviewTitle`. */
export interface RouteDocumentMeta {
  titleKey: string
  descriptionKey?: string
}

interface RouteMetaPrefixRule extends RouteDocumentMeta {
  prefix: string
}

/** Exact pathname → meta (dashboard + admin shells, marketing, auth, checkout). */
const EXACT_ROUTE_META: Record<string, RouteDocumentMeta> = {
  // —— Dashboard (from DashboardLayout) ——
  '/dashboard': {
    titleKey: 'common:layout.dashboard.overviewTitle',
    descriptionKey: 'common:layout.dashboard.overviewDesc',
  },
  '/dashboard/novels': {
    titleKey: 'common:layout.dashboard.novelsTitle',
    descriptionKey: 'common:layout.dashboard.novelsDesc',
  },
  '/dashboard/bookstore': {
    titleKey: 'common:layout.dashboard.bookstoreTitle',
    descriptionKey: 'common:layout.dashboard.bookstoreDesc',
  },
  '/dashboard/my-library': {
    titleKey: 'common:layout.dashboard.myLibraryTitle',
    descriptionKey: 'common:layout.dashboard.myLibraryDesc',
  },
  '/dashboard/billing': {
    titleKey: 'common:layout.dashboard.billsTitle',
    descriptionKey: 'common:layout.dashboard.billsDesc',
  },
  '/dashboard/usage': {
    titleKey: 'common:layout.dashboard.usageTitle',
    descriptionKey: 'common:layout.dashboard.usageDesc',
  },
  '/dashboard/settings/profile': {
    titleKey: 'common:layout.dashboard.settingsProfileTitle',
    descriptionKey: 'common:layout.dashboard.settingsProfileDesc',
  },
  '/dashboard/settings/models': {
    titleKey: 'common:layout.dashboard.settingsModelsTitle',
    descriptionKey: 'common:layout.dashboard.settingsModelsDesc',
  },
  '/dashboard/settings/preferences': {
    titleKey: 'common:layout.dashboard.settingsPreferencesTitle',
    descriptionKey: 'common:layout.dashboard.settingsPreferencesDesc',
  },
  '/dashboard/settings/referral': {
    titleKey: 'common:layout.dashboard.settingsReferralTitle',
    descriptionKey: 'common:layout.dashboard.settingsReferralDesc',
  },
  '/dashboard/settings/feedback': {
    titleKey: 'common:layout.dashboard.settingsFeedbackTitle',
    descriptionKey: 'common:layout.dashboard.settingsFeedbackDesc',
  },

  // —— Admin (from AdminLayout) ——
  '/admin': {
    titleKey: 'common:layout.admin.overviewTitle',
    descriptionKey: 'common:layout.admin.overviewDesc',
  },
  '/admin/analytics/platform': {
    titleKey: 'admin:analytics.tabPlatform',
    descriptionKey: 'common:layout.admin.analyticsPlatformDesc',
  },
  '/admin/analytics/revenue': {
    titleKey: 'admin:analytics.tabRevenue',
    descriptionKey: 'common:layout.admin.analyticsRevenueDesc',
  },
  '/admin/analytics/content': {
    titleKey: 'admin:analytics.tabContent',
    descriptionKey: 'common:layout.admin.analyticsContentDesc',
  },
  '/admin/billing/cdk': {
    titleKey: 'common:layout.admin.billingCdkTitle',
    descriptionKey: 'common:layout.admin.billingCdkDesc',
  },
  '/admin/billing/approve': {
    titleKey: 'common:layout.admin.billingApproveTitle',
    descriptionKey: 'common:layout.admin.billingApproveDesc',
  },
  '/admin/billing/balance': {
    titleKey: 'common:layout.admin.billingBalanceTitle',
    descriptionKey: 'common:layout.admin.billingBalanceDesc',
  },
  '/admin/billing/overage': {
    titleKey: 'common:layout.admin.billingOverageTitle',
    descriptionKey: 'common:layout.admin.billingOverageDesc',
  },
  '/admin/billing/plans': {
    titleKey: 'common:layout.admin.plansTitle',
    descriptionKey: 'common:layout.admin.plansDesc',
  },
  '/admin/billing/payment': {
    titleKey: 'common:layout.admin.billingPaymentTitle',
    descriptionKey: 'common:layout.admin.billingPaymentDesc',
  },
  '/admin/billing/orders': {
    titleKey: 'common:layout.admin.paymentOrdersTitle',
    descriptionKey: 'common:layout.admin.paymentOrdersDesc',
  },
  '/admin/billing/referrals': {
    titleKey: 'common:layout.admin.referralsTitle',
    descriptionKey: 'common:layout.admin.referralsDesc',
  },
  '/admin/billing/gift-campaigns': {
    titleKey: 'common:layout.admin.giftCampaignsTitle',
    descriptionKey: 'common:layout.admin.giftCampaignsDesc',
  },
  '/admin/users': {
    titleKey: 'common:layout.admin.usersTitle',
    descriptionKey: 'common:layout.admin.usersDesc',
  },
  '/admin/users/roles': {
    titleKey: 'common:layout.admin.userRolesTitle',
    descriptionKey: 'common:layout.admin.userRolesDesc',
  },
  '/admin/users/permissions': {
    titleKey: 'common:layout.admin.userPermissionsTitle',
    descriptionKey: 'common:layout.admin.userPermissionsDesc',
  },
  '/admin/users/membership': {
    titleKey: 'common:layout.admin.userMembershipTitle',
    descriptionKey: 'common:layout.admin.userMembershipDesc',
  },
  '/admin/users/invite-codes': {
    titleKey: 'common:layout.admin.inviteCodesTitle',
    descriptionKey: 'common:layout.admin.inviteCodesDesc',
  },
  '/admin/audit-log': {
    titleKey: 'common:layout.admin.auditLogTitle',
    descriptionKey: 'common:layout.admin.auditLogDesc',
  },
  '/admin/content/legal': {
    titleKey: 'common:layout.admin.contentLegalTitle',
    descriptionKey: 'common:layout.admin.contentLegalDesc',
  },
  '/admin/content/announcements': {
    titleKey: 'common:layout.admin.contentAnnouncementsTitle',
    descriptionKey: 'common:layout.admin.contentAnnouncementsDesc',
  },
  '/admin/notification': {
    titleKey: 'common:layout.admin.notificationTitle',
    descriptionKey: 'common:layout.admin.notificationDesc',
  },
  '/admin/content/pages': {
    titleKey: 'common:layout.admin.contentPagesTitle',
    descriptionKey: 'common:layout.admin.contentPagesDesc',
  },
  '/admin/content/catalog': {
    titleKey: 'common:layout.admin.catalogTitle',
    descriptionKey: 'common:layout.admin.catalogDesc',
  },
  '/admin/content/uploads': {
    titleKey: 'common:layout.admin.uploadOpsTitle',
    descriptionKey: 'common:layout.admin.uploadOpsDesc',
  },
  '/admin/system/models': {
    titleKey: 'common:layout.admin.modelsTitle',
    descriptionKey: 'common:layout.admin.modelsDesc',
  },
  '/admin/system/monitoring': {
    titleKey: 'common:layout.admin.systemMonitoringTitle',
    descriptionKey: 'common:layout.admin.systemMonitoringDesc',
  },
  '/admin/system/jobs': {
    titleKey: 'common:layout.admin.systemJobsTitle',
    descriptionKey: 'common:layout.admin.systemJobsDesc',
  },
  '/admin/system/settings': {
    titleKey: 'common:layout.admin.systemSettingsTitle',
    descriptionKey: 'common:layout.admin.systemSettingsDesc',
  },

  // —— Marketing ——
  '/': { titleKey: 'marketing:brand' },
  '/guide': { titleKey: 'marketing:nav.guide' },
  '/pricing': { titleKey: 'marketing:nav.pricing' },
  '/about': { titleKey: 'marketing:nav.about' },
  '/privacy': { titleKey: 'marketing:footer.privacy' },
  '/terms': { titleKey: 'marketing:footer.terms' },
  '/contact': { titleKey: 'marketing:footer.contact' },

  // —— Checkout ——
  '/checkout': { titleKey: 'marketing:pricing.checkout.pageTitle' },

  // —— Auth ——
  '/login': { titleKey: 'auth:login.title' },
  '/register': { titleKey: 'auth:register.title' },
  '/forgot-password': { titleKey: 'auth:forgot.title' },
  '/reset-password': { titleKey: 'auth:reset.title' },
  '/verify-email': { titleKey: 'auth:verify.marketingHeadline' },
}

/**
 * Prefix rules (longest match wins). Used for nested admin billing redirects and editor chapters.
 * Order is not significant — resolution picks the longest matching prefix.
 */
const PREFIX_ROUTE_META: RouteMetaPrefixRule[] = [
  {
    prefix: '/admin/billing/',
    titleKey: 'common:layout.admin.billingPaymentTitle',
    descriptionKey: 'common:layout.admin.billingPaymentDesc',
  },
  {
    prefix: '/editor',
    titleKey: 'editor:page.defaultChapterTitle',
  },
]

function normalizePathname(pathname: string): string {
  const base = pathname.split('?')[0]?.split('#')[0] ?? pathname
  if (base === '/' || base === '') {
    return '/'
  }
  return base.replace(/\/+$/, '')
}

function matchesPrefix(path: string, prefix: string): boolean {
  if (prefix.endsWith('/')) {
    return path.startsWith(prefix)
  }
  return path === prefix || path.startsWith(`${prefix}/`)
}

function resolvePrefixMeta(path: string): RouteDocumentMeta | null {
  let best: RouteMetaPrefixRule | null = null
  for (const rule of PREFIX_ROUTE_META) {
    if (matchesPrefix(path, rule.prefix)) {
      if (!best || rule.prefix.length > best.prefix.length) {
        best = rule
      }
    }
  }
  if (!best) {
    return null
  }
  return { titleKey: best.titleKey, descriptionKey: best.descriptionKey }
}

function resolveSectionFallback(path: string): RouteDocumentMeta {
  if (path.startsWith('/admin')) {
    return { titleKey: 'common:layout.admin.defaultTitle' }
  }
  if (path.startsWith('/dashboard')) {
    return { titleKey: 'common:layout.dashboard.defaultTitle' }
  }
  return { titleKey: 'common:appName' }
}

/** Resolve document meta i18n keys for a React Router pathname. Exact match first, then longest prefix. */
export function resolveMetaForPath(pathname: string): RouteDocumentMeta {
  const path = normalizePathname(pathname)

  const exact = EXACT_ROUTE_META[path]
  if (exact) {
    return exact
  }

  const prefix = resolvePrefixMeta(path)
  if (prefix) {
    return prefix
  }

  return resolveSectionFallback(path)
}
