import { describe, expect, it } from 'vitest'
import {
  APP_STATE_STORAGE_KEY,
  buildRestoreLocation,
  buildSearchWithSessionPrefs,
  readLocaleFromSearch,
  readThemeFromSearch,
  stripSessionQuery,
  type PersistedAppState,
} from './appSessionState'

describe('appSessionState', () => {
  it('reads locale and theme from search params', () => {
    expect(readLocaleFromSearch('?lang=en&theme=dark')).toBe('en')
    expect(readThemeFromSearch('?lang=en&theme=dark')).toBe('dark')
  })

  it('merges session prefs into search without dropping business params', () => {
    expect(buildSearchWithSessionPrefs('?foo=bar', 'en', 'dark')).toBe('?foo=bar&lang=en&theme=dark')
    expect(stripSessionQuery('?foo=bar&lang=en&theme=system')).toBe('?foo=bar')
  })

  it('builds restore location with prefs', () => {
    const state: PersistedAppState = {
      pathname: '/guide',
      search: '',
      hash: '#demo-story',
      locale: 'en',
      theme: 'dark',
      updatedAt: Date.now(),
    }
    expect(buildRestoreLocation(state)).toBe('/guide?lang=en&theme=dark#demo-story')
  })

  it('exports stable storage key', () => {
    expect(APP_STATE_STORAGE_KEY).toBe('na-app-state')
  })
})
