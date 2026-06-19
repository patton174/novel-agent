import { describe, expect, it } from 'vitest'

import { MEMORY_NODE_ICON_NAMES, normalizeMemoryIconName } from './memoryNodeIcons'

describe('memoryNodeIcons', () => {
  it('accepts PascalCase lucide names', () => {
    expect(normalizeMemoryIconName('Globe')).toBe('Globe')
    expect(normalizeMemoryIconName('book-open')).toBe('BookOpen')
  })

  it('rejects emoji and non-ascii labels', () => {
    expect(normalizeMemoryIconName('🌍')).toBeNull()
    expect(normalizeMemoryIconName('角色')).toBeNull()
    expect(normalizeMemoryIconName('NotARealIcon')).toBeNull()
  })

  it('allowlist is stable', () => {
    expect(MEMORY_NODE_ICON_NAMES).toContain('Globe')
    expect(MEMORY_NODE_ICON_NAMES).toContain('BookOpen')
  })
})
