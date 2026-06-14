import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getActiveCryptoMaterial, isBootstrapAuthPath } from './cryptoMaterial'
import * as cryptoRuntime from './cryptoRuntime'
import * as sessionStore from './sessionStore'

describe('cryptoMaterial', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('identifies bootstrap auth paths', () => {
    expect(isBootstrapAuthPath('/api/auth/api/login')).toBe(true)
    expect(isBootstrapAuthPath('/api/auth/api/register')).toBe(true)
    expect(isBootstrapAuthPath('/api/billing/auth/danmaku')).toBe(false)
  })

  it('prefers session crypto for authenticated API calls', async () => {
    vi.spyOn(sessionStore, 'getSessionCrypto').mockReturnValue({
      keyId: 'session-kid',
      aesKeyB64: btoa('session-key-material-32-bytes!!'),
      keyVersion: 2,
      expiresAt: Date.now() + 3_600_000,
    })
    const ensureSpy = vi.spyOn(cryptoRuntime, 'ensureCryptoRuntime')

    const material = await getActiveCryptoMaterial('/api/content/auth/novels')

    expect(material?.keyId).toBe('session-kid')
    expect(ensureSpy).not.toHaveBeenCalled()
  })

  it('retries bootstrap when session crypto is missing', async () => {
    vi.spyOn(sessionStore, 'getSessionCrypto').mockReturnValue(null)
    const ensureSpy = vi
      .spyOn(cryptoRuntime, 'ensureCryptoRuntime')
      .mockResolvedValue({
        keyId: 'boot-kid',
        aesKeyB64: btoa('bootstrap-key-material-32-bytes'),
        version: 1,
        expiresAtEpochMs: Date.now() + 86_400_000,
      })
    vi.spyOn(cryptoRuntime, 'getBootstrapCryptoMaterial')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        keyId: 'boot-kid',
        aesKeyB64: btoa('bootstrap-key-material-32-bytes'),
        keyVersion: 1,
        expiresAt: Date.now() + 86_400_000,
      })

    const material = await getActiveCryptoMaterial('/api/billing/auth/danmaku?pageSize=20')

    expect(material?.keyId).toBe('boot-kid')
    expect(ensureSpy).toHaveBeenCalledWith(false)
    expect(ensureSpy).toHaveBeenCalledWith(true)
  })

  it('forces bootstrap for login path even when session exists', async () => {
    vi.spyOn(sessionStore, 'getSessionCrypto').mockReturnValue({
      keyId: 'session-kid',
      aesKeyB64: btoa('session-key-material-32-bytes!!'),
      keyVersion: 2,
      expiresAt: Date.now() + 3_600_000,
    })
    vi.spyOn(cryptoRuntime, 'ensureCryptoRuntime').mockResolvedValue({
      keyId: 'boot-kid',
      aesKeyB64: btoa('bootstrap-key-material-32-bytes'),
      version: 1,
      expiresAtEpochMs: Date.now() + 86_400_000,
    })
    vi.spyOn(cryptoRuntime, 'getBootstrapCryptoMaterial').mockReturnValue({
      keyId: 'boot-kid',
      aesKeyB64: btoa('bootstrap-key-material-32-bytes'),
      keyVersion: 1,
      expiresAt: Date.now() + 86_400_000,
    })

    const material = await getActiveCryptoMaterial('/api/auth/api/login')

    expect(material?.keyId).toBe('boot-kid')
  })
})
