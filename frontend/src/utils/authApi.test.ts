import { afterEach, describe, expect, it, vi } from 'vitest'
import { secureFetch } from '../security/secureFetch'
import { register } from './authApi'

vi.mock('../security/secureFetch', () => ({
  secureFetch: vi.fn(),
}))

vi.mock('../security/cryptoRuntime', () => ({
  ensureCryptoRuntime: vi.fn(async () => undefined),
}))

function mockRegisterOk() {
  vi.mocked(secureFetch).mockResolvedValue({
    ok: true,
    json: async () => ({ code: 200, data: null, message: 'ok' }),
  } as Response)
}

describe('register', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sends inviteCode camelCase in JSON body when provided', async () => {
    mockRegisterOk()

    await register('writer1', 'secret12', 'writer@example.com', '123456', 'NA-INV-TEST')

    expect(secureFetch).toHaveBeenCalledOnce()
    const [, init] = vi.mocked(secureFetch).mock.calls[0]!
    const body = JSON.parse(String(init?.body)) as Record<string, string>
    expect(body.inviteCode).toBe('NA-INV-TEST')
    expect(body).not.toHaveProperty('invite_code')
  })

  it('omits inviteCode when blank', async () => {
    mockRegisterOk()

    await register('writer2', 'secret12', 'writer2@example.com', '123456', '   ')

    const [, init] = vi.mocked(secureFetch).mock.calls[0]!
    const body = JSON.parse(String(init?.body)) as Record<string, string>
    expect(body).not.toHaveProperty('inviteCode')
    expect(body).not.toHaveProperty('invite_code')
  })
})
