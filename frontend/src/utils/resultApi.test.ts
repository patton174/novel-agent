import { describe, expect, it } from 'vitest'
import { readApiErrorMessage, resolveErrorMessage } from './resultApi'

describe('resolveErrorMessage', () => {
  it('maps gateway security message to Chinese', () => {
    expect(resolveErrorMessage({ code: 400, message: 'request sign required' }, 400)).toBe(
      '请求签名缺失，请刷新页面后重试',
    )
  })

  it('parses JSON string payloads', () => {
    expect(
      resolveErrorMessage('{"code":400,"message":"request sign required"}', 400),
    ).toBe('请求签名缺失，请刷新页面后重试')
  })
})

describe('readApiErrorMessage', () => {
  it('reads gateway error bodies', async () => {
    const response = new Response(JSON.stringify({ code: 400, message: 'request sign required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
    await expect(readApiErrorMessage(response)).resolves.toBe('请求签名缺失，请刷新页面后重试')
  })
})
