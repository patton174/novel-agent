import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  applySessionPrefsFromSearch,
  buildRestoreLocation,
  buildSearchWithSessionPrefs,
  canRestoreFromRoot,
  currentAppLocale,
  isEphemeralPath,
  readPersistedAppState,
  shouldRestoreOnRootEntry,
  stripSessionQuery,
  writePersistedAppState,
} from '@/lib/appSessionState'
import { useThemeStore } from '@/stores/themeStore'

/**
 * 持久化语言/主题/路径；从根路径 `/` 进入时恢复上次访问位置，并通过 URL query 携带 lang & theme。
 */
export function useAppSessionRestore() {
  const location = useLocation()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const bootstrapDoneRef = useRef(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    applySessionPrefsFromSearch(location.search)
  }, [location.search])

  useEffect(() => {
    if (bootstrapDoneRef.current) {
      return
    }

    if (shouldRestoreOnRootEntry(location.pathname)) {
      const saved = readPersistedAppState()
      if (saved && saved.pathname !== '/' && canRestoreFromRoot(saved.pathname)) {
        bootstrapDoneRef.current = true
        navigate(buildRestoreLocation(saved), { replace: true })
        return
      }
    }

    bootstrapDoneRef.current = true
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!bootstrapDoneRef.current || syncingRef.current) {
      return
    }

    const pendingRestore =
      shouldRestoreOnRootEntry(location.pathname) &&
      (() => {
        const saved = readPersistedAppState()
        return Boolean(saved && saved.pathname !== '/')
      })()

    if (pendingRestore) {
      return
    }

    const locale = currentAppLocale(i18n.language)
    const activeTheme = useThemeStore.getState().theme
    const businessSearch = stripSessionQuery(location.search)
    const nextSearch = buildSearchWithSessionPrefs(businessSearch, locale, activeTheme)
    const normalizedCurrent = location.search || ''
    const normalizedNext = nextSearch.startsWith('?') ? nextSearch : nextSearch ? `?${nextSearch}` : ''

    if (!isEphemeralPath(location.pathname)) {
      writePersistedAppState({
        pathname: location.pathname,
        search: businessSearch,
        hash: location.hash,
        locale,
        theme: activeTheme,
      })
    }

    if (normalizedNext !== normalizedCurrent) {
      syncingRef.current = true
      navigate(
        { pathname: location.pathname, search: normalizedNext.replace(/^\?/, ''), hash: location.hash },
        { replace: true },
      )
      queueMicrotask(() => {
        syncingRef.current = false
      })
    }
  }, [location.hash, location.pathname, location.search, navigate, theme, i18n.language])
}
