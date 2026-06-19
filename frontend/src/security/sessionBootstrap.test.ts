import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('session bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    sessionStorage.clear()
    document.cookie = 'na_csrf=; Max-Age=0; path=/'
  })

  it('does not refresh token for visitors without a local session hint', async () => {
    const refreshSession = vi.fn(async () => true)
    vi.doMock('./cryptoRuntime', () => ({
      ensureCryptoRuntime: vi.fn(async () => undefined),
    }))
    vi.doMock('../utils/authApi', () => ({
      refreshSession,
    }))

    const { startSessionBootstrap } = await import('./sessionBootstrap')

    await startSessionBootstrap()

    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('does not treat a stale csrf cookie as a session hint', async () => {
    document.cookie = 'na_csrf=stale-csrf; path=/'
    const refreshSession = vi.fn(async () => true)
    vi.doMock('./cryptoRuntime', () => ({
      ensureCryptoRuntime: vi.fn(async () => undefined),
    }))
    vi.doMock('../utils/authApi', () => ({
      refreshSession,
    }))

    const { startSessionBootstrap } = await import('./sessionBootstrap')

    await startSessionBootstrap()

    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('refreshes token when a stored session exists', async () => {
    sessionStorage.setItem('na_access_token', 'stale-token')
    sessionStorage.setItem('na_user_id', '42')
    sessionStorage.setItem(
      'na_session_crypto',
      JSON.stringify({
        keyId: 'k1',
        aesKeyB64: 'abc',
        keyVersion: 1,
        expiresAt: Date.now() + 60_000,
      }),
    )

    const refreshSession = vi.fn(async () => true)
    vi.doMock('./cryptoRuntime', () => ({
      ensureCryptoRuntime: vi.fn(async () => undefined),
    }))
    vi.doMock('../utils/authApi', () => ({
      refreshSession,
    }))

    const { startSessionBootstrap } = await import('./sessionBootstrap')

    await startSessionBootstrap()

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })
})
