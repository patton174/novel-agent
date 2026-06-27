/**
 * 公开 SEO 路由清单 — sitemap 与 prerender 共用。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')
const catalogPath = path.join(frontendRoot, 'src/content/blog/catalog.json')

/** @type {{ path: string, priority: number, changefreq: string, lastmod?: string }[]} */
export const STATIC_SEO_PAGES = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/compare', priority: 0.9, changefreq: 'weekly' },
  { path: '/guide', priority: 0.9, changefreq: 'monthly' },
  { path: '/blog', priority: 0.85, changefreq: 'weekly' },
  { path: '/pricing', priority: 0.8, changefreq: 'monthly' },
  { path: '/about', priority: 0.7, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/contact', priority: 0.4, changefreq: 'yearly' },
  { path: '/register', priority: 0.8, changefreq: 'monthly' },
  { path: '/login', priority: 0.5, changefreq: 'monthly' },
]

export function readBlogCatalog() {
  const raw = fs.readFileSync(catalogPath, 'utf8')
  return JSON.parse(raw)
}

export function marketingPrerenderRoutes() {
  const blog = readBlogCatalog().map((entry) => `/blog/${entry.slug}`)
  return ['/', '/guide', '/compare', '/pricing', '/about', '/blog', ...blog]
}

export function allSitemapEntries(siteOrigin) {
  const origin = siteOrigin.replace(/\/$/, '')
  const staticEntries = STATIC_SEO_PAGES.map((page) => ({
    loc: `${origin}${page.path === '/' ? '' : page.path}`,
    changefreq: page.changefreq,
    priority: page.priority,
    lastmod: page.lastmod,
  }))

  const blogEntries = readBlogCatalog().map((entry) => ({
    loc: `${origin}/blog/${entry.slug}`,
    changefreq: entry.changefreq ?? 'monthly',
    priority: entry.priority ?? 0.8,
    lastmod: entry.publishedAt,
  }))

  return [...staticEntries, ...blogEntries]
}
