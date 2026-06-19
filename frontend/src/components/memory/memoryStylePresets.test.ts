import { describe, expect, it } from 'vitest'
import {
  MEMORY_LAYOUT_KEYS,
  MEMORY_LAYOUT_PRESETS,
  normalizeLayout,
  presetSyncManifest,
  resolveDefaultLayout,
  resolveNodePresentation,
} from './memoryStylePresets'

describe('memoryStylePresets', () => {
  it('normalizes unknown layout to prose', () => {
    expect(normalizeLayout('nope')).toBe('prose')
  })

  it('hero for world root both', () => {
    const p = resolveNodePresentation(null, { scope: 'world', depth: 0, nodeKind: 'both', isRoot: true })
    expect(p.layout).toBe('hero')
  })

  it('outline for depth>=2 without explicit layout', () => {
    expect(resolveDefaultLayout(null, { scope: 'world', depth: 2, nodeKind: 'section' })).toBe('outline')
  })

  it('prose default at depth 1 without explicit layout', () => {
    const p = resolveNodePresentation(null, { scope: '角色库', depth: 1, nodeKind: 'leaf' })
    expect(p.layout).toBe('prose')
  })

  it('renders lucide icon name', () => {
    const p = resolveNodePresentation(
      { layout: 'cards', icon: 'Globe', accent: 'emerald', variant: 'emphasis' },
      { scope: 'character', depth: 1, nodeKind: 'leaf' },
    )
    expect(p.icon).toBe('Globe')
    expect(p.accentClass).toContain('emerald')
    expect(p.containerClass).toContain('ring-primary')
  })

  it('drops emoji icon names', () => {
    const p = resolveNodePresentation(
      { layout: 'quote', icon: '🌍' },
      { scope: 'world', depth: 1, nodeKind: 'leaf' },
    )
    expect(p.icon).toBeUndefined()
  })

  it('muted variant softens title and content', () => {
    const p = resolveNodePresentation(
      { layout: 'quote', variant: 'muted' },
      { scope: 'world', depth: 1, nodeKind: 'leaf' },
    )
    expect(p.titleClass).toContain('text-muted-foreground')
    expect(p.contentClass).toContain('text-muted-foreground')
  })

  it('level adds indent class', () => {
    const p = resolveNodePresentation({ layout: 'prose', level: 2 }, { scope: 'world', depth: 1 })
    expect(p.levelIndentClass).toBe('ml-2')
  })

  it('preset keys match python MEMORY_LAYOUT_KEYS', () => {
    expect(MEMORY_LAYOUT_KEYS.sort()).toEqual(
      ['accordion', 'cards', 'hero', 'outline', 'prose', 'quote', 'timeline'].sort(),
    )
    expect(Object.keys(MEMORY_LAYOUT_PRESETS).sort()).toEqual(MEMORY_LAYOUT_KEYS.slice().sort())
  })

  it('preset sync manifest matches python FRONTEND_SYNC_MANIFEST', () => {
    const byLayout = (rows: Array<Record<string, unknown>>) =>
      Object.fromEntries(rows.map((row) => [row.layout, row]))
    const expected = [
      {
        layout: 'accordion',
        variant: 'default',
        collapse_default: false,
        show_content_inline: false,
      },
      {
        layout: 'outline',
        variant: 'default',
        collapse_default: true,
        show_content_inline: false,
      },
      {
        layout: 'cards',
        variant: 'emphasis',
        collapse_default: false,
        show_content_inline: true,
      },
      {
        layout: 'timeline',
        variant: 'default',
        collapse_default: false,
        show_content_inline: true,
      },
      {
        layout: 'hero',
        variant: 'emphasis',
        collapse_default: false,
        show_content_inline: true,
      },
      {
        layout: 'quote',
        variant: 'muted',
        collapse_default: false,
        show_content_inline: true,
      },
      {
        layout: 'prose',
        variant: 'default',
        collapse_default: false,
        show_content_inline: true,
      },
    ]
    expect(byLayout(presetSyncManifest())).toEqual(byLayout(expected))
  })
})
