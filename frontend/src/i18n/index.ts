import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import commonZh from './locales/zh/common.json'
import marketingZh from './locales/zh/marketing.json'
import authZh from './locales/zh/auth.json'
import dashboardZh from './locales/zh/dashboard.json'
import editorZh from './locales/zh/editor.json'
import adminZh from './locales/zh/admin.json'

const loadedBundles = new Set<string>(['zh:common', 'zh:marketing', 'zh:auth', 'zh:dashboard', 'zh:editor', 'zh:admin'])

function bundleKey(ns: string, lng: string): string {
  return `${lng}:${ns}`
}

void i18n.use(initReactI18next).init({
  lng: 'zh',
  fallbackLng: 'zh',
  defaultNS: 'common',
  ns: ['common', 'marketing', 'auth', 'dashboard', 'editor', 'admin'],
  resources: {
    zh: { 
      common: commonZh, 
      marketing: marketingZh,
      auth: authZh,
      dashboard: dashboardZh,
      editor: editorZh,
      admin: adminZh
    },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

/** Lazy-load a namespace bundle (route-level code splitting). */
export async function loadNamespace(ns: string, lng = 'zh'): Promise<void> {
  const key = bundleKey(ns, lng)
  if (loadedBundles.has(key)) return
  const mod = await import(`./locales/${lng}/${ns}.json`)
  i18n.addResourceBundle(lng, ns, mod.default, true, true)
  loadedBundles.add(key)
}

export default i18n
