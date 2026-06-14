import { describe, expect, it } from 'vitest'
import { parseJsonWithSafeIds, sanitizeJsonIdsForParse } from './jsonSafeIds'

describe('jsonSafeIds', () => {
  it('preserves snowflake user id as string', () => {
    const raw = '{"id":2064977478497079297,"username":"patton174"}'
    const parsed = parseJsonWithSafeIds(raw) as { id: string; username: string }
    expect(parsed.id).toBe('2064977478497079297')
    expect(parsed.username).toBe('patton174')
  })

  it('does not stringify non-id large numbers', () => {
    const raw = '{"count":123456789012345678}'
    const sanitized = sanitizeJsonIdsForParse(raw)
    expect(sanitized).toBe(raw)
  })

  it('stringifies userId in nested result', () => {
    const raw =
      '{"code":200,"data":{"list":[{"id":2064977478497079297,"userId":2064977478497079297}]}}'
    const parsed = parseJsonWithSafeIds(raw) as {
      data: { list: Array<{ id: string; userId: string }> }
    }
    expect(parsed.data.list[0]?.id).toBe('2064977478497079297')
    expect(parsed.data.list[0]?.userId).toBe('2064977478497079297')
  })
})
