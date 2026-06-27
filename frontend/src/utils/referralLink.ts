/** Build user referral URL — lands on register page with `?ref=` for cookie capture. */
export function buildReferralLink(code: string, origin = ''): string {
  const trimmed = code.trim()
  if (!trimmed) return ''
  const base =
    origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/register?ref=${encodeURIComponent(trimmed)}`
}

/** Prefer server link when valid; rewrite legacy `/?ref=` to `/register?ref=`. */
export function resolveReferralLink(code: string, serverLink?: string | null): string {
  const trimmedCode = code.trim()
  if (!trimmedCode) return ''

  const server = serverLink?.trim()
  if (server) {
    try {
      const url = new URL(server, typeof window !== 'undefined' ? window.location.origin : 'https://example.com')
      const ref = url.searchParams.get('ref')?.trim() || trimmedCode
      if (!url.pathname || url.pathname === '/') {
        return buildReferralLink(ref, url.origin)
      }
      return server
    } catch {
      /* fall through */
    }
  }

  return buildReferralLink(trimmedCode)
}
