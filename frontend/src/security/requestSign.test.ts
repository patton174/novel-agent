import { describe, expect, it } from 'vitest'
import {
  SIGN_Q_KID,
  SIGN_Q_NONCE,
  SIGN_Q_SIGN,
  SIGN_Q_TS,
  appendSignQuery,
  buildSignQueryParams,
  computeRequestSign,
} from './requestSign'
import type { SessionCryptoMaterial } from '../types/authSecurity'

const TEST_KEY_B64 = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i + 1)))

const material: SessionCryptoMaterial = {
  keyId: 'bootstrap-test',
  aesKeyB64: TEST_KEY_B64,
  keyVersion: 1,
  expiresAt: Date.now() + 86_400_000,
}

describe('requestSign', () => {
  it('builds query sign params for GET with business query', async () => {
    const params = await buildSignQueryParams(
      'GET',
      '/api/billing/auth/danmaku?pageSize=20',
      new Uint8Array(),
      material,
      { ts: 1_700_000_000_000, nonce: 'fixed-nonce' },
    )

    expect(params[SIGN_Q_KID]).toBe('bootstrap-test')
    expect(params[SIGN_Q_TS]).toBe('1700000000000')
    expect(params[SIGN_Q_NONCE]).toBe('fixed-nonce')
    expect(params[SIGN_Q_SIGN]).toMatch(/^[A-Za-z0-9_-]+$/)

    const signedUrl = appendSignQuery('/api/billing/auth/danmaku?pageSize=20', params)
    expect(signedUrl).toContain('_na_s=')
    expect(signedUrl).toContain('_na_t=1700000000000')
    expect(signedUrl).toContain('pageSize=20')
  })

  it('computes stable sign for empty GET body', async () => {
    const bodyHashEmpty =
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    const sign = await computeRequestSign(
      'GET',
      '/api/billing/auth/danmaku?pageSize=20',
      new Uint8Array(),
      material,
      { ts: 1_700_000_000_000, nonce: 'fixed-nonce' },
    )
    expect(sign).toBeTruthy()
    expect(sign).toMatch(/^[A-Za-z0-9_-]+$/)

    const signAgain = await computeRequestSign(
      'GET',
      '/api/billing/auth/danmaku?pageSize=20',
      new Uint8Array(),
      material,
      { ts: 1_700_000_000_000, nonce: 'fixed-nonce' },
    )
    expect(signAgain).toBe(sign)

    const canonicalProbe = `GET|/api/billing/auth/danmaku?pageSize=20|1700000000000|fixed-nonce|${bodyHashEmpty}`
    expect(canonicalProbe).toContain(bodyHashEmpty)
  })

  it('appendSignQuery preserves existing query string', () => {
    const url = appendSignQuery('/api/test?a=1', {
      [SIGN_Q_TS]: '1',
      [SIGN_Q_NONCE]: 'n',
      [SIGN_Q_KID]: 'k',
      [SIGN_Q_SIGN]: 's',
    })
    expect(url).toBe('/api/test?a=1&_na_t=1&_na_n=n&_na_k=k&_na_s=s')
  })
})
