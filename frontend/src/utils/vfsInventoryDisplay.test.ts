import { describe, expect, it } from 'vitest'
import {
  formatGlobGrepDisplayOutput,
  formatMemoryCatalogLines,
  formatPathsAsTree,
} from './vfsInventoryDisplay'

describe('vfsInventoryDisplay', () => {
  it('builds tree from flat paths', () => {
    const tree = formatPathsAsTree([
      '/novel/n1/chapters/a.md',
      '/novel/n1/chapters/b.md',
    ])
    const text = tree.join('\n')
    expect(text).toContain('novel/')
    expect(text).toContain('├──')
    expect(text).toContain('a.md')
  })

  it('renders memory paths as DB catalog not file tree', () => {
    const encoded = encodeURIComponent('唐云')
    const paths = [
      `/novel/n1/memory/character/${encoded}.json`,
      `/novel/n1/memory/background/${encodeURIComponent('末法时代背景')}.json`,
    ]
    const lines = formatMemoryCatalogLines(paths)
    const text = lines.join('\n')
    expect(text).toContain('story-memory')
    expect(text).toContain('角色库')
    expect(text).toContain('唐云')
    expect(text).toContain('背景设定')
    expect(text).not.toContain('%E5')
    expect(text).not.toContain('├──')
  })

  it('preserves backend tree lines and strips headers', () => {
    const raw = [
      '# 数据来源：作品库 HTTP API',
      '├── novel/',
      '│   └── chapters/',
      '│       └── index.json',
    ].join('\n')
    const out = formatGlobGrepDisplayOutput(raw)
    expect(out).not.toContain('数据来源')
    expect(out).toContain('├──')
    expect(out).not.toContain('、')
  })
})
