import { describe, expect, it } from 'vitest'
import { buildReferralLink, resolveReferralLink } from './referralLink'

describe('referralLink', () => {
  it('builds register page link with ref query', () => {
    expect(buildReferralLink('abc123', 'https://example.com')).toBe(
      'https://example.com/register?ref=abc123',
    )
  })

  it('rewrites legacy root referral links to register', () => {
    expect(resolveReferralLink('abc123', 'https://example.com/?ref=abc123')).toBe(
      'https://example.com/register?ref=abc123',
    )
  })

  it('keeps register links from server', () => {
    const link = 'https://example.com/register?ref=abc123'
    expect(resolveReferralLink('abc123', link)).toBe(link)
  })
})
