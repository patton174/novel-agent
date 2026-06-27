import { describe, expect, it } from 'vitest'
import { absoluteSiteUrl, isPublicSeoPath } from '@/config/siteSeo'

describe('siteSeo', () => {
  it('marks marketing paths as public seo', () => {
    expect(isPublicSeoPath('/compare')).toBe(true)
    expect(isPublicSeoPath('/blog')).toBe(true)
    expect(isPublicSeoPath('/dashboard')).toBe(false)
  })

  it('builds absolute urls with lang query', () => {
    expect(absoluteSiteUrl('/guide', 'en')).toContain('/guide')
    expect(absoluteSiteUrl('/guide', 'en')).toContain('lang=en')
  })
})
