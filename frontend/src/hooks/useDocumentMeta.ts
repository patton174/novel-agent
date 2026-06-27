import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { absoluteSiteUrl, isPublicSeoPath, SITE_OG_IMAGE, SITE_ORIGIN } from '@/config/siteSeo'
import { getBlogEntry } from '@/content/blog/articles'
import { resolveMetaForPath } from '@/config/routeDocumentMeta'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'
import {
  removeJsonLd,
  removeLinks,
  removeMeta,
  upsertJsonLd,
  upsertLink,
  upsertMeta,
} from '@/utils/documentHead'

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

function siteNameForPath(pathname: string, t: (key: string) => string): string {
  if (isPublicSeoPath(pathname)) {
    return t('marketing:seo.siteName')
  }
  return t('common:appName')
}

function buildSoftwareJsonLd(
  name: string,
  description: string,
  url: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    applicationCategory: 'WritingApplication',
    operatingSystem: 'Web',
    url,
    description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
    },
  }
}

function buildArticleJsonLd(
  headline: string,
  description: string,
  url: string,
  datePublished: string,
  publisherName: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url,
    datePublished,
    author: {
      '@type': 'Organization',
      name: publisherName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: {
        '@type': 'ImageObject',
        url: SITE_OG_IMAGE,
      },
    },
  }
}

export function useDocumentMeta(): void {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation(['common', 'marketing', 'auth', 'editor', 'dashboard', 'admin'])
  const isDark = useResolvedDarkMode()

  const metaKeys = useMemo(() => resolveMetaForPath(pathname), [pathname])

  const pageTitle = useMemo(() => t(metaKeys.titleKey), [metaKeys.titleKey, t, i18n.language])

  const pageDescription = useMemo(() => {
    if (metaKeys.descriptionKey) {
      return t(metaKeys.descriptionKey)
    }
    if (isPublicSeoPath(pathname)) {
      return t('marketing:seo.defaultDescription')
    }
    return ''
  }, [metaKeys.descriptionKey, pathname, t, i18n.language])

  const siteName = useMemo(
    () => siteNameForPath(pathname, t),
    [pathname, t, i18n.language],
  )

  const documentTitle = `${pageTitle} · ${siteName}`

  useEffect(() => {
    document.title = documentTitle
    document.documentElement.lang = resolveHtmlLang(i18n.language)
    syncFavicon(isDark)

    const canonical = absoluteSiteUrl(pathname, i18n.language.startsWith('en') ? 'en' : 'zh')
    upsertLink('canonical', canonical)
    upsertLink('alternate', absoluteSiteUrl(pathname, 'zh'), { hreflang: 'zh-CN' })
    upsertLink('alternate', absoluteSiteUrl(pathname, 'en'), { hreflang: 'en' })
    upsertLink('alternate', absoluteSiteUrl(pathname, 'zh'), { hreflang: 'x-default' })

    if (pageDescription) {
      upsertMeta('description', pageDescription)
      upsertMeta('og:description', pageDescription, 'property')
      upsertMeta('twitter:description', pageDescription)
    } else {
      removeMeta('description')
      removeMeta('og:description', 'property')
      removeMeta('twitter:description')
    }

    upsertMeta('og:title', documentTitle, 'property')
    upsertMeta('og:url', canonical, 'property')
    upsertMeta('og:type', pathname.startsWith('/blog/') ? 'article' : 'website', 'property')
    upsertMeta('og:site_name', siteName, 'property')
    upsertMeta('og:locale', i18n.language.startsWith('en') ? 'en_US' : 'zh_CN', 'property')
    upsertMeta('og:image', SITE_OG_IMAGE, 'property')
    upsertMeta('twitter:card', 'summary')
    upsertMeta('twitter:title', documentTitle)

    if (pathname === '/' || pathname === '/compare') {
      upsertJsonLd(
        buildSoftwareJsonLd(siteName, pageDescription || t('marketing:seo.defaultDescription'), SITE_ORIGIN),
      )
    } else if (pathname.startsWith('/blog/')) {
      const slug = pathname.slice('/blog/'.length)
      const entry = getBlogEntry(slug)
      if (entry) {
        upsertJsonLd(
          buildArticleJsonLd(
            pageTitle,
            pageDescription,
            canonical,
            entry.publishedAt,
            siteName,
          ),
        )
      } else {
        removeJsonLd()
      }
    } else {
      removeJsonLd()
    }

    return () => {
      removeLinks('alternate')
    }
  }, [documentTitle, pageDescription, pathname, i18n.language, isDark, siteName, t])
}
