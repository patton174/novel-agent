import { describe, expect, it } from 'vitest'
import {
  buildToolDetailSections,
  formatToolInputFromPayload,
  toolOutputFromPayload,
} from './toolDetailFormat'

describe('toolDetailFormat', () => {
  it('formats Read tool_input without raw md path', () => {
    const text = formatToolInputFromPayload(
      {
        file_path: '/novel/u1/chapters/abc.md',
        offset: 10,
        limit: 50,
      },
      'Read',
    )
    expect(text).not.toContain('abc.md')
    expect(text).toMatch(/章节/)
    expect(text).toContain('起始行: 10')
  })

  it('formats Glob output as tree from payload.output', () => {
    const out = toolOutputFromPayload(
      {
        output: [
          '├── novel/',
          '│   └── chapters/',
          '│       └── index.json',
        ].join('\n'),
      },
      'Glob',
    )
    expect(out).toContain('├──')
    expect(out).not.toContain('、')
  })

  it('renders EditChapter new_content/new_title as text, never raw JSON', () => {
    const text = formatToolInputFromPayload(
      { chapter_id: 'c1', new_content: '崭新的整章正文', new_title: '新标题' },
      'EditChapter',
    )
    expect(text).toContain('正文: 崭新的整章正文')
    expect(text).toContain('改名为: 新标题')
    expect(text).not.toContain('{')
  })

  it('falls back to scalar lines (no JSON braces) for unknown args', () => {
    const text = formatToolInputFromPayload(
      { some_unknown_field: 'hello', count: 3 },
      'MysteryTool',
    )
    expect(text).toContain('some_unknown_field: hello')
    expect(text).toContain('count: 3')
    expect(text).not.toContain('{')
    expect(text).not.toContain('"')
  })

  it('returns undefined when only non-scalar args remain (no JSON dump)', () => {
    const text = formatToolInputFromPayload({ nested: { a: 1 }, list: [1, 2] }, 'X')
    expect(text).toBeUndefined()
  })

  it('never surfaces bare ids/UUIDs in the scalar fallback', () => {
    const text = formatToolInputFromPayload(
      { chapter_id: 'a1b2c3d4-0000-1111-2222-333344445555', tool_call_id: 'call_x' },
      'ReadChapter',
    )
    expect(text).toBeUndefined()
  })

  it('renders CreateMemory title, scope, and content', () => {
    const text = formatToolInputFromPayload(
      {
        node_type: 'root',
        scope: 'world',
        title: '世界观',
        content: '# 世界观 markdown',
        style: { layout: 'hero' },
      },
      'CreateMemory',
    )
    expect(text).toContain('节点类型: 根节点')
    expect(text).toContain('正文: # 世界观 markdown')
    expect(text).toContain('范围: world')
    expect(text).toContain('标题: 世界观')
    expect(text).toContain('排版: hero')
    expect(text).not.toContain('{')
  })

  it('buildToolDetailSections merges input and output', () => {
    const { input, output } = buildToolDetailSections({
      stepId: 's1',
      status: 'completed',
      toolName: 'Read',
      toolInputText: '路径: chapters/x.md',
      toolOutputDetail: '第一章正文…',
    })
    expect(input).toContain('chapters/x.md')
    expect(output).toContain('第一章')
  })
})
