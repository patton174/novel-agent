import { describe, expect, it, vi, beforeEach } from 'vitest'
import { toPythonStreamBody } from './agentStreamPayload'

describe('toPythonStreamBody', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid',
    })
    sessionStorage.clear()
  })

  it('reuses stable session_id when provided', () => {
    const body = toPythonStreamBody({
      message: '继续写',
      mode: 'continue',
      session_id: 'session_fixed',
      history: [{ role: 'user', content: '你好' }],
    })
    expect(body.session_id).toBe('session_fixed')
    expect((body.context as { history: unknown[] }).history).toHaveLength(1)
  })
})
