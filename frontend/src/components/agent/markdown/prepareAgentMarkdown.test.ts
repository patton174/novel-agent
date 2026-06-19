import { describe, expect, it } from 'vitest'
import { prepareAgentMarkdown } from './prepareAgentMarkdown'

describe('prepareAgentMarkdown', () => {
  it('delegates to normalizeAgentMarkdown', () => {
    expect(prepareAgentMarkdown('##标题')).toBe('## 标题')
  })

  it('returns empty string for nullish input', () => {
    expect(prepareAgentMarkdown(null)).toBe('')
    expect(prepareAgentMarkdown(undefined)).toBe('')
  })
})
