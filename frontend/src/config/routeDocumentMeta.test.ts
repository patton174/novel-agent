import { describe, expect, it } from 'vitest'
import { resolveMetaForPath } from './routeDocumentMeta'

describe('resolveMetaForPath', () => {
  it('resolves exact dashboard routes from layout map', () => {
    expect(resolveMetaForPath('/dashboard/novels')).toEqual({
      titleKey: 'common:layout.dashboard.novelsTitle',
      descriptionKey: 'common:layout.dashboard.novelsDesc',
    })
  })

  it('resolves exact admin routes from layout map', () => {
    expect(resolveMetaForPath('/admin/system/monitoring')).toEqual({
      titleKey: 'common:layout.admin.systemMonitoringTitle',
      descriptionKey: 'common:layout.admin.systemMonitoringDesc',
    })
  })

  it('prefers exact admin billing routes over billing prefix', () => {
    expect(resolveMetaForPath('/admin/billing/plans').titleKey).toBe('common:layout.admin.plansTitle')
    expect(resolveMetaForPath('/admin/billing/orders').titleKey).toBe(
      'common:layout.admin.paymentOrdersTitle',
    )
    expect(resolveMetaForPath('/admin/billing/referrals')).toEqual({
      titleKey: 'common:layout.admin.referralsTitle',
      descriptionKey: 'common:layout.admin.referralsDesc',
    })
    expect(resolveMetaForPath('/admin/billing/gift-campaigns')).toEqual({
      titleKey: 'common:layout.admin.giftCampaignsTitle',
      descriptionKey: 'common:layout.admin.giftCampaignsDesc',
    })
  })

  it('resolves growth-ops admin routes', () => {
    expect(resolveMetaForPath('/admin/users/invite-codes')).toEqual({
      titleKey: 'common:layout.admin.inviteCodesTitle',
      descriptionKey: 'common:layout.admin.inviteCodesDesc',
    })
    expect(resolveMetaForPath('/admin/notification')).toEqual({
      titleKey: 'common:layout.admin.notificationTitle',
      descriptionKey: 'common:layout.admin.notificationDesc',
    })
  })

  it('matches admin billing prefix for redirect-only subpaths', () => {
    expect(resolveMetaForPath('/admin/billing/platform')).toEqual({
      titleKey: 'common:layout.admin.billingPaymentTitle',
      descriptionKey: 'common:layout.admin.billingPaymentDesc',
    })
    expect(resolveMetaForPath('/admin/billing/coupons').titleKey).toBe(
      'common:layout.admin.billingPaymentTitle',
    )
  })

  it('resolves marketing, auth, and checkout routes', () => {
    expect(resolveMetaForPath('/pricing').titleKey).toBe('marketing:nav.pricing')
    expect(resolveMetaForPath('/login').titleKey).toBe('auth:login.title')
    expect(resolveMetaForPath('/checkout').titleKey).toBe('marketing:pricing.checkout.pageTitle')
  })

  it('matches editor routes by prefix', () => {
    expect(resolveMetaForPath('/editor').titleKey).toBe('editor:page.defaultChapterTitle')
    expect(resolveMetaForPath('/editor/chapter-abc').titleKey).toBe('editor:page.defaultChapterTitle')
  })

  it('normalizes trailing slashes and strips query/hash', () => {
    expect(resolveMetaForPath('/dashboard/settings/profile/')).toEqual(
      resolveMetaForPath('/dashboard/settings/profile'),
    )
    expect(resolveMetaForPath('/pricing?lang=en#faq').titleKey).toBe('marketing:nav.pricing')
  })

  it('falls back by section for unknown nested paths', () => {
    expect(resolveMetaForPath('/admin/unknown-page').titleKey).toBe('common:layout.admin.defaultTitle')
    expect(resolveMetaForPath('/dashboard/unknown').titleKey).toBe('common:layout.dashboard.defaultTitle')
    expect(resolveMetaForPath('/unknown').titleKey).toBe('common:appName')
  })
})
