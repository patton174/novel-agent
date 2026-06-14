import type { Location } from 'react-router-dom'
import { useThemeStore } from '@/stores/themeStore'
import {
  SESSION_QUERY_LANG,
  SESSION_QUERY_THEME,
  buildSearchWithSessionPrefs,
  currentAppLocale,
  isEphemeralPath,
  stripSessionQuery,
} from '@/lib/appSessionState'

export function buildReturnPath(location?: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  if (location) {
    const businessSearch = stripSessionQuery(location.search)
    return `${location.pathname}${businessSearch}${location.hash}`
  }
  if (typeof window === 'undefined') {
    return '/dashboard'
  }
  const businessSearch = stripSessionQuery(window.location.search)
  return `${window.location.pathname}${businessSearch}${window.location.hash}`
}

export function resolveSafeReturnTo(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) {
    return null
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return null
  }
  const pathname = value.split('?')[0]?.split('#')[0] ?? value
  if (isEphemeralPath(pathname)) {
    return null
  }
  return value
}

export function buildLoginSearch(options?: { reason?: string; returnPath?: string }): string {
  const params = new URLSearchParams()
  if (options?.reason) {
    params.set('reason', options.reason)
  }

  const returnPath = resolveSafeReturnTo(
    options?.returnPath ?? (typeof window !== 'undefined' ? buildReturnPath() : null),
  )
  if (returnPath) {
    params.set('returnTo', returnPath)
  }

  const locale = typeof window !== 'undefined' ? currentAppLocale() : 'zh'
  const theme = typeof window !== 'undefined' ? useThemeStore.getState().theme : 'system'
  params.set(SESSION_QUERY_LANG, locale)
  params.set(SESSION_QUERY_THEME, theme)
  return params.toString()
}

export function buildLoginHref(options?: { reason?: string; returnPath?: string }): string {
  return `/login?${buildLoginSearch(options)}`
}

/** 登录成功后跳转：保留 returnTo 里的业务参数，并确保 lang/theme 在 URL 上 */
export function buildPostLoginHref(
  returnTo: string | null | undefined,
  locale?: string,
  theme?: string,
): string {
  const safe = resolveSafeReturnTo(returnTo)
  if (!safe) {
    return '/dashboard'
  }
  const hashIndex = safe.indexOf('#')
  const hash = hashIndex >= 0 ? safe.slice(hashIndex) : ''
  const pathAndQuery = hashIndex >= 0 ? safe.slice(0, hashIndex) : safe
  const queryIndex = pathAndQuery.indexOf('?')
  const pathname = queryIndex >= 0 ? pathAndQuery.slice(0, queryIndex) : pathAndQuery
  const search = queryIndex >= 0 ? pathAndQuery.slice(queryIndex) : ''
  const loc = currentAppLocale(locale)
  const mode = useThemeStore.getState().theme
  const resolvedTheme =
    theme === 'light' || theme === 'dark' || theme === 'system' ? theme : mode
  const mergedSearch = buildSearchWithSessionPrefs(search, loc, resolvedTheme)
  return `${pathname}${mergedSearch}${hash}`
}
