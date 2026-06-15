import { describe, expect, it } from 'vitest'
import {
  buildLoginHref,
  buildPostLoginHref,
  buildReturnPath,
  resolveSafeReturnTo,
} from './authRedirect'

describe('authRedirect', () => {
  it('builds login href with returnTo and session prefs', () => {
    const href = buildLoginHref({
      reason: 'session_expired',
      returnPath:
        '/editor/ch-1?novelId=n1&sessionId=s1&conversationId=s1&tab=story',
    })
    expect(href).toContain('/login?')
    expect(href).toContain('reason=session_expired')
    expect(href).toContain('returnTo=%2Feditor%2Fch-1%3FnovelId%3Dn1%26sessionId%3Ds1%26conversationId%3Ds1%26tab%3Dstory')
    expect(href).toContain('lang=')
    expect(href).toContain('theme=')
  })

  it('rejects unsafe return paths', () => {
    expect(resolveSafeReturnTo('https://evil.test')).toBeNull()
    expect(resolveSafeReturnTo('/login')).toBeNull()
    expect(resolveSafeReturnTo('/editor?novelId=1')).toBe('/editor?novelId=1')
  })

  it('merges lang and theme after login', () => {
    const target = buildPostLoginHref('/editor?novelId=n1&sessionId=s1', 'en', 'dark')
    expect(target).toContain('/editor?')
    expect(target).toContain('novelId=n1')
    expect(target).toContain('sessionId=s1')
    expect(target).toContain('lang=en')
    expect(target).toContain('theme=dark')
  })

  it('defaults to home when returnTo is missing', () => {
    expect(buildPostLoginHref(null)).toBe('/')
    expect(buildPostLoginHref(undefined)).toBe('/')
  })

  it('strips session query from return path helper input', () => {
    const path = buildReturnPath({
      pathname: '/editor',
      search: '?novelId=n1&lang=en&theme=dark',
      hash: '',
    })
    expect(path).toBe('/editor?novelId=n1')
  })
})
