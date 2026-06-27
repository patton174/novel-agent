/** 公开站点 SEO 常量（构建时 VITE_SITE_ORIGIN 可覆盖） */
import { isBlogSlug } from '@/content/blog/articles'

export const SITE_ORIGIN =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined)?.replace(/\/$/, '') ||
  'https://www.novel-agent.cn'

export const SITE_OG_IMAGE = `${SITE_ORIGIN}/novel-icon.svg`

/** 可被搜索引擎索引的公开路径（与 sitemap 对齐） */
export const PUBLIC_INDEXABLE_PATHS = [
  '/',
  '/guide',
  '/pricing',
  '/about',
  '/compare',
  '/blog',
  '/privacy',
  '/terms',
  '/contact',
  '/login',
  '/register',
] as const

export function isPublicSeoPath(pathname: string): boolean {
  const path = pathname.split('?')[0]?.split('#')[0] ?? pathname
  const normalized = path === '' ? '/' : path.replace(/\/+$/, '') || '/'
  if (PUBLIC_INDEXABLE_PATHS.includes(normalized as (typeof PUBLIC_INDEXABLE_PATHS)[number])) {
    return true
  }
  if (normalized.startsWith('/blog/')) {
    const slug = normalized.slice('/blog/'.length)
    return isBlogSlug(slug)
  }
  return normalized === '/checkout' || normalized === '/forgot-password'
}

export function absoluteSiteUrl(pathname: string, lang?: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const base = `${SITE_ORIGIN}${path === '/' ? '' : path}`
  if (!lang || lang === 'zh') {
    return base || SITE_ORIGIN + '/'
  }
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}lang=${lang}`
}
