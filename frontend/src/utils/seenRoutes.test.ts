import { afterEach, describe, expect, it } from 'vitest'
import { hasRouteBeenSeen, markRouteSeen } from './seenRoutes'

const STORAGE_KEY = 'na:seen-routes'

describe('seenRoutes', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('marks and reads a pathname', () => {
    expect(hasRouteBeenSeen('/dashboard/novels')).toBe(false)
    markRouteSeen('/dashboard/novels')
    expect(hasRouteBeenSeen('/dashboard/novels')).toBe(true)
  })

  it('persists seen routes in sessionStorage', () => {
    markRouteSeen('/admin/users')
    const raw = sessionStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toContain('/admin/users')
  })

  it('does not duplicate entries on repeat mark', () => {
    markRouteSeen('/dashboard')
    markRouteSeen('/dashboard')
    const raw = sessionStorage.getItem(STORAGE_KEY)
    expect(JSON.parse(raw!)).toEqual(['/dashboard'])
  })
})
