import { isLoggedIn } from '@/utils/auth'
import { THEME_STORAGE_KEY, useThemeStore, type ThemeMode } from '@/stores/themeStore'

export const LOCALE_STORAGE_KEY = 'novel-agent-locale'
export const APP_STATE_STORAGE_KEY = 'na-app-state'

export const SESSION_QUERY_LANG = 'lang'
export const SESSION_QUERY_THEME = 'theme'

export type AppLocale = 'zh' | 'en'

export interface PersistedAppState {
  pathname: string
  search: string
  hash: string
  locale: AppLocale
  theme: ThemeMode
  updatedAt: number
}

const EPHEMERAL_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
])

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function isAppLocale(value: string | null): value is AppLocale {
  return value === 'zh' || value === 'en'
}

export function readStoredLocale(): AppLocale {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export function readLocaleFromSearch(search: string): AppLocale | null {
  const raw = new URLSearchParams(search).get(SESSION_QUERY_LANG)
  return isAppLocale(raw) ? raw : null
}

export function readThemeFromSearch(search: string): ThemeMode | null {
  const raw = new URLSearchParams(search).get(SESSION_QUERY_THEME)
  return isThemeMode(raw) ? raw : null
}

export function readInitialLocaleFromUrlOrStorage(): AppLocale {
  if (typeof window === 'undefined') {
    return 'zh'
  }
  return readLocaleFromSearch(window.location.search) ?? readStoredLocale()
}

export function readInitialThemeFromUrlOrStorage(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system'
  }
  const fromUrl = readThemeFromSearch(window.location.search)
  if (fromUrl) {
    return fromUrl
  }
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

export function stripSessionQuery(search: string): string {
  const params = new URLSearchParams(search)
  params.delete(SESSION_QUERY_LANG)
  params.delete(SESSION_QUERY_THEME)
  const next = params.toString()
  return next ? `?${next}` : ''
}

export function buildSearchWithSessionPrefs(
  search: string,
  locale: AppLocale,
  theme: ThemeMode,
): string {
  const params = new URLSearchParams(stripSessionQuery(search).replace(/^\?/, ''))
  params.set(SESSION_QUERY_LANG, locale)
  params.set(SESSION_QUERY_THEME, theme)
  const next = params.toString()
  return next ? `?${next}` : ''
}

export function isEphemeralPath(pathname: string): boolean {
  return EPHEMERAL_PATHS.has(pathname)
}

export function readPersistedAppState(): PersistedAppState | null {
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as PersistedAppState
    if (!parsed?.pathname || typeof parsed.pathname !== 'string') {
      return null
    }
    return {
      pathname: parsed.pathname,
      search: typeof parsed.search === 'string' ? parsed.search : '',
      hash: typeof parsed.hash === 'string' ? parsed.hash : '',
      locale: isAppLocale(parsed.locale) ? parsed.locale : readStoredLocale(),
      theme: isThemeMode(parsed.theme) ? parsed.theme : 'system',
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return null
  }
}

export function writePersistedAppState(state: Omit<PersistedAppState, 'updatedAt'>): void {
  try {
    const payload: PersistedAppState = { ...state, updatedAt: Date.now() }
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function shouldRestoreOnRootEntry(pathname: string): boolean {
  return pathname === '/'
}

export function canRestorePath(pathname: string): boolean {
  if (isEphemeralPath(pathname)) {
    return false
  }
  const requiresAuth =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/editor') ||
    pathname.startsWith('/admin')
  if (requiresAuth && !isLoggedIn()) {
    return false
  }
  return true
}

/** 从 `/` 进入时仅恢复工作台类路径，营销页（定价/指南等）不自动跳转 */
export function canRestoreFromRoot(pathname: string): boolean {
  if (pathname === '/') {
    return false
  }
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/editor') ||
    pathname.startsWith('/admin')
  ) && canRestorePath(pathname)
}

export function buildRestoreLocation(state: PersistedAppState): string {
  const businessSearch = stripSessionQuery(state.search)
  const search = buildSearchWithSessionPrefs(businessSearch, state.locale, state.theme)
  return `${state.pathname}${search}${state.hash}`
}

export function applySessionPrefsFromSearch(search: string): void {
  const locale = readLocaleFromSearch(search)
  if (locale) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
    void import('@/i18n').then(({ default: i18n }) => {
      if (!i18n.language.startsWith(locale)) {
        void i18n.changeLanguage(locale)
      }
    })
  }

  const theme = readThemeFromSearch(search)
  if (theme) {
    useThemeStore.getState().setTheme(theme)
  }
}

export function currentAppLocale(language?: string): AppLocale {
  if (language?.startsWith('en')) {
    return 'en'
  }
  if (language?.startsWith('zh')) {
    return 'zh'
  }
  return readStoredLocale()
}
