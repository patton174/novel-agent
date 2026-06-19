import { describe, expect, it } from 'vitest'

import { commitLoginSession, pickAccessToken } from './loginSession'
import { getAccessToken } from './sessionStore'

describe('login session commit', () => {
  it('extracts token field variants', () => {
    expect(pickAccessToken({ token: 'a' })).toBe('a')
    expect(pickAccessToken({ accessToken: 'b' })).toBe('b')
    expect(pickAccessToken({ access_token: 'c' })).toBe('c')
    expect(pickAccessToken({ username: 'x' })).toBeNull()
  })

  it('writes token to sessionStorage and memory', () => {
    sessionStorage.clear()
    sessionStorage.setItem('na_access_token', 'stale')

    const ok = commitLoginSession({
      token: 'new-jwt',
      userId: 1,
      sessionId: 'sess_1',
    })

    expect(ok).toBe(true)
    expect(sessionStorage.getItem('na_access_token')).toBe('new-jwt')
    expect(getAccessToken()).toBe('new-jwt')
  })
})
