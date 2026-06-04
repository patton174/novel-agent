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
