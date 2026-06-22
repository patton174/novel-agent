import { describe, expect, it } from 'vitest'
import { APP_MOBILE_MAX_PX, APP_MOBILE_MEDIA } from './breakpoints'
import { EDITOR_CREATE_HREF, editorNovelHref } from './editorRoutes'
import { MKT_CTA_AUTH, MKT_CTA_PRIMARY } from './marketingCta'

/** Phase 21 — 设计 token / 路由约定 smoke（无 DOM） */
describe('ui smoke', () => {
  it('editor routes follow create + novelId convention', () => {
    expect(EDITOR_CREATE_HREF).toBe('/editor?action=create')
    expect(editorNovelHref('abc 123')).toBe('/editor?novelId=abc%20123')
  })

  it('mobile breakpoint aligns with Tailwind max-md (767px)', () => {
    expect(APP_MOBILE_MAX_PX).toBe(767)
    expect(APP_MOBILE_MEDIA).toBe('(max-width: 767px)')
  })

  it('marketing CTAs use neo-brutalist geometry (sharp corners, theme border, hard shadow)', () => {
    expect(MKT_CTA_PRIMARY).toContain('rounded-none')
    expect(MKT_CTA_PRIMARY).toContain('border-2')
    expect(MKT_CTA_PRIMARY).toContain('border-foreground')
    expect(MKT_CTA_PRIMARY).toContain('shadow-soft')
    expect(MKT_CTA_AUTH).toContain('rounded-none')
    expect(MKT_CTA_PRIMARY).not.toContain('rounded-xl')
    expect(MKT_CTA_PRIMARY).not.toContain('rounded-full')
    expect(MKT_CTA_PRIMARY).not.toContain('mkt-cta-glow')
  })
})
