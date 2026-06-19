import { describe, expect, it } from 'vitest'
import {
  isPrimaryAgentStreamActive,
  shouldOpenRecoverySse,
} from './agentStreamLease'

describe('agentStreamLease', () => {
  it('detects active primary stream', () => {
    const ac = new AbortController()
    expect(isPrimaryAgentStreamActive(ac)).toBe(true)
    expect(shouldOpenRecoverySse(ac)).toBe(false)
    ac.abort()
    expect(isPrimaryAgentStreamActive(ac)).toBe(false)
    expect(shouldOpenRecoverySse(ac)).toBe(true)
  })
})
