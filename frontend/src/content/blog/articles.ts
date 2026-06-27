import catalog from './catalog.json'

export interface BlogCatalogEntry {
  slug: string
  publishedAt: string
  priority: number
  changefreq: 'weekly' | 'monthly' | 'yearly'
}

export const BLOG_CATALOG = catalog as BlogCatalogEntry[]

export function getBlogSlugs(): string[] {
  return BLOG_CATALOG.map((entry) => entry.slug)
}

export function getBlogEntry(slug: string): BlogCatalogEntry | undefined {
  return BLOG_CATALOG.find((entry) => entry.slug === slug)
}

export function isBlogSlug(slug: string): boolean {
  return getBlogSlugs().includes(slug)
}

export function blogArticlePath(slug: string): string {
  return `/blog/${slug}`
}
