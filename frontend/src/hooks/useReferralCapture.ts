import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const REFERRAL_COOKIE_NAME = 'na-ref'
const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export function readReferralCode(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REFERRAL_COOKIE_NAME}=([^;]+)`))
  if (!match?.[1]) return ''
  try {
    return decodeURIComponent(match[1]).trim()
  } catch {
    return match[1].trim()
  }
}

export function captureReferralFromSearch(search: string): void {
  const ref = new URLSearchParams(search).get('ref')?.trim()
  if (!ref) return
  const encoded = encodeURIComponent(ref)
  document.cookie = `${REFERRAL_COOKIE_NAME}=${encoded}; Max-Age=${REFERRAL_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
}

/** Persist `?ref=CODE` (e.g. `/register?ref=`) into cookie `na-ref` (30 days). */
export function useReferralCapture(): void {
  const location = useLocation()

  useEffect(() => {
    captureReferralFromSearch(location.search)
  }, [location.search])
}
