import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { resolveMetaForPath } from '@/config/routeDocumentMeta'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'

const FAVICON_LIGHT = '/novel-icon.svg'
const FAVICON_DARK = '/novel-icon-dark.svg'
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function resolveDarkMode(theme: ThemeMode, systemDark: boolean): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return systemDark
}

function resolveHtmlLang(language: string): string {
  return language.startsWith('en') ? 'en' : 'zh-CN'
}

function syncFavicon(isDark: boolean) {
  const href = isDark ? FAVICON_DARK : FAVICON_LIGHT
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    document.head.appendChild(link)
  }
  if (!link.href.endsWith(href)) {
    link.href = href
  }
}

function useResolvedDarkMode(): boolean {
  const theme = useThemeStore((s) => s.theme)
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DARK_MEDIA_QUERY).matches : false,
  )

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return
    const media = window.matchMedia(DARK_MEDIA_QUERY)
    const onChange = () => setSystemDark(media.matches)
    onChange()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    }
    media.addListener(onChange)
    return () => media.removeListener(onChange)
  }, [theme])

  return resolveDarkMode(theme, systemDark)
}

export function useDocumentMeta(): void {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation(['common', 'marketing', 'auth', 'editor', 'dashboard', 'admin'])
  const isDark = useResolvedDarkMode()

  const pageTitle = useMemo(() => {
    const { titleKey } = resolveMetaForPath(pathname)
    return t(titleKey)
  }, [pathname, t, i18n.language])

  const appName = t('common:appName')
  const documentTitle = `${pageTitle} · ${appName}`

  useEffect(() => {
    document.title = documentTitle
    document.documentElement.lang = resolveHtmlLang(i18n.language)
    syncFavicon(isDark)
  }, [documentTitle, i18n.language, isDark])
}
