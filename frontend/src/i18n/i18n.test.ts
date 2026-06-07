import { describe, expect, it } from 'vitest'
import i18n, { loadNamespace } from './index'

describe('i18n', () => {
  it('initializes with zh common namespace', () => {
    expect(i18n.language).toBe('zh')
    expect(i18n.t('loading')).toBe('加载中…')
    expect(i18n.t('nav.dashboard')).toBe('工作台')
  })

  it('falls back gracefully for missing keys', () => {
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('lazy-loads en common namespace', async () => {
    await loadNamespace('common', 'en')
    expect(i18n.getResourceBundle('en', 'common')?.loading).toBe('Loading…')
  })
})
