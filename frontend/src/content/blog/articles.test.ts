import { describe, expect, it } from 'vitest'
import { getBlogEntry, getBlogSlugs, isBlogSlug } from '@/content/blog/articles'
import { isPublicSeoPath } from '@/config/siteSeo'

describe('blog catalog', () => {
  it('lists pillar article slug', () => {
    expect(getBlogSlugs()).toContain('how-to-choose-ai-novel-writing-tool')
  })

  it('resolves catalog entry metadata', () => {
    const entry = getBlogEntry('how-to-choose-ai-novel-writing-tool')
    expect(entry?.publishedAt).toBe('2026-06-26')
    expect(isBlogSlug('how-to-choose-ai-novel-writing-tool')).toBe(true)
    expect(isBlogSlug('missing-slug')).toBe(false)
  })

  it('marks blog article paths as public seo', () => {
    expect(isPublicSeoPath('/blog')).toBe(true)
    expect(isPublicSeoPath('/blog/how-to-choose-ai-novel-writing-tool')).toBe(true)
    expect(isPublicSeoPath('/blog/unknown')).toBe(false)
  })
})
