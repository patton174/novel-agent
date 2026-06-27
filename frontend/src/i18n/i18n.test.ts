import { describe, expect, it } from 'vitest'
import i18n, { loadNamespace } from './index'
import commonZh from './locales/zh/common.json'
import commonEn from './locales/en/common.json'
import authZh from './locales/zh/auth.json'
import authEn from './locales/en/auth.json'
import marketingZh from './locales/zh/marketing.json'
import marketingEn from './locales/en/marketing.json'
import dashboardZh from './locales/zh/dashboard.json'
import dashboardEn from './locales/en/dashboard.json'
import editorZh from './locales/zh/editor.json'
import editorEn from './locales/en/editor.json'
import adminZh from './locales/zh/admin.json'
import adminEn from './locales/en/admin.json'

function flattenLocaleKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenLocaleKeys(v as Record<string, unknown>, key))
    } else {
      out[key] = String(v)
    }
  }
  return out
}

function placeholderVars(value: string): string[] {
  const matches = value.match(/\{\{[^}]+\}\}/g) ?? []
  return [...new Set(matches)].sort()
}

const localePairs = [
  ['common', commonZh, commonEn],
  ['auth', authZh, authEn],
  ['marketing', marketingZh, marketingEn],
  ['dashboard', dashboardZh, dashboardEn],
  ['editor', editorZh, editorEn],
  ['admin', adminZh, adminEn],
] as const

describe('locale parity', () => {
  it.each(localePairs)('%s zh/en key parity', (_ns, zh, en) => {
    const zhKeys = flattenLocaleKeys(zh)
    const enKeys = flattenLocaleKeys(en)
    const missingInEn = Object.keys(zhKeys).filter((k) => !(k in enKeys))
    const missingInZh = Object.keys(enKeys).filter((k) => !(k in zhKeys))
    expect(missingInEn, `keys in zh missing in en: ${missingInEn.join(', ')}`).toEqual([])
    expect(missingInZh, `keys in en missing in zh: ${missingInZh.join(', ')}`).toEqual([])
  })

  it.each(localePairs)('%s zh/en placeholder parity', (_ns, zh, en) => {
    const zhKeys = flattenLocaleKeys(zh)
    const enKeys = flattenLocaleKeys(en)
    for (const key of Object.keys(zhKeys)) {
      expect(placeholderVars(enKeys[key]), `placeholder mismatch at ${key}`).toEqual(
        placeholderVars(zhKeys[key]),
      )
    }
  })
})

describe('i18n', () => {
  it('initializes with zh common namespace', () => {
    expect(i18n.language).toBe('zh')
    expect(i18n.t('loading.label')).toBe('加载中…')
    expect(i18n.t('nav.dashboard')).toBe('工作台')
  })

  it('falls back gracefully for missing keys', () => {
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('lazy-loads en common namespace', async () => {
    await loadNamespace('common', 'en')
    expect(i18n.getResourceBundle('en', 'common')?.loading?.label).toBe('Loading…')
  })
})
