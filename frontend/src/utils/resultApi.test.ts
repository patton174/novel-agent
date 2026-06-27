import i18n from '@/i18n'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readApiErrorMessage, resolveErrorMessage } from './resultApi'

const GATEWAY_KEY = 'errors.api.gateway.requestSignRequired'

describe('resolveErrorMessage', () => {
  beforeEach(() => {
    i18n.changeLanguage('zh')
  })

  afterEach(() => {
    i18n.changeLanguage('zh')
  })

  it('maps gateway security message to Chinese (zh default)', () => {
    expect(resolveErrorMessage({ code: 400, message: 'request sign required' }, 400)).toBe(
      i18n.t(GATEWAY_KEY),
    )
    expect(resolveErrorMessage({ code: 400, message: 'request sign required' }, 400)).toBe(
      '请求签名缺失，请刷新页面后重试',
    )
  })

  it('maps gateway security message to English (en)', async () => {
    await i18n.changeLanguage('en')
    expect(resolveErrorMessage({ code: 400, message: 'request sign required' }, 400)).toBe(
      i18n.t(GATEWAY_KEY),
    )
    expect(resolveErrorMessage({ code: 400, message: 'request sign required' }, 400)).toBe(
      'Request signature missing. Please refresh the page and try again.',
    )
  })

  it('parses JSON string payloads', () => {
    expect(
      resolveErrorMessage('{"code":400,"message":"request sign required"}', 400),
    ).toBe(i18n.t(GATEWAY_KEY))
  })

  it('uses translated generic failure when only code is present', () => {
    expect(resolveErrorMessage({ code: 503 }, 503)).toBe(
      i18n.t('errors.api.requestFailed', { code: 503 }),
    )
  })

  it('uses translated generic failure for bare HTTP status', () => {
    expect(resolveErrorMessage(null, 502)).toBe(
      i18n.t('errors.api.requestFailed', { code: 502 }),
    )
  })
})

describe('readApiErrorMessage', () => {
  beforeEach(() => {
    i18n.changeLanguage('zh')
  })

  afterEach(() => {
    i18n.changeLanguage('zh')
  })

  it('reads gateway error bodies', async () => {
    const response = new Response(JSON.stringify({ code: 400, message: 'request sign required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
    await expect(readApiErrorMessage(response)).resolves.toBe(i18n.t(GATEWAY_KEY))
  })
})
