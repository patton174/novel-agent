import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('auth refresh', () => {
  beforeEach(() => {
    vi.resetModules()
    sessionStorage.clear()
  })

  it('coalesces concurrent refresh requests', async () => {
    let resolveResponse!: (response: Response) => void
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve
    })
    const secureFetch = vi.fn(() => pendingResponse)
    vi.doMock('./secureFetch', () => ({
      secureFetch,
    }))
    vi.doMock('./heartbeat', () => ({
      startHeartbeatWorker: vi.fn(),
    }))

    const { refreshSessionInternal } = await import('./authRefresh')
    const first = refreshSessionInternal()
    const second = refreshSessionInternal()

    resolveResponse(new Response(JSON.stringify({
      code: 200,
      msg: 'ok',
      success: true,
      data: {
        token: 'access-token',
        username: 'writer',
        role: 'user',
        expiresIn: 3600,
      },
    })))

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(secureFetch).toHaveBeenCalledTimes(1)
  })

  it('persists JWT from refresh response into sessionStorage', async () => {
    sessionStorage.setItem('na_access_token', 'stale-token')

    vi.doMock('./secureFetch', () => ({
      secureFetch: vi.fn(async () => new Response(JSON.stringify({
        code: 200,
        msg: 'ok',
        success: true,
        data: {
          token: 'fresh-jwt-token',
          userId: 42,
          username: 'writer',
          role: 'user',
          expiresIn: 3600,
          sessionId: 'sess_test',
          sessionCrypto: {
            keyId: 'k2',
            aesKeyB64: 'def456',
            keyVersion: 1,
            expiresAtEpochMs: Date.now() + 60_000,
          },
        },
      }))),
    }))
    vi.doMock('./heartbeat', () => ({
      startHeartbeatWorker: vi.fn(),
    }))

    const { refreshSessionInternal } = await import('./authRefresh')
    const { getAccessToken } = await import('./sessionStore')

    const ok = await refreshSessionInternal()

    expect(ok).toBe(true)
    expect(sessionStorage.getItem('na_access_token')).toBe('fresh-jwt-token')
    expect(getAccessToken()).toBe('fresh-jwt-token')
  })
})
