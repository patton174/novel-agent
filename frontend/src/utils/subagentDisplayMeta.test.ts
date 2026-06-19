import { describe, expect, it } from 'vitest'
import type { AgentSubagentState } from '../types/agent'
import { deriveSubagentDisplayMeta } from './subagentDisplayMeta'

function baseSubagent(
  overrides: Partial<AgentSubagentState> = {},
): AgentSubagentState {
  return {
    description: '角色一致性校验\n检查主角台词是否符合人设',
    status: 'active',
    logs: [],
    ...overrides,
  }
}

describe('deriveSubagentDisplayMeta', () => {
  it('derives name from first line and body from rest', () => {
    const meta = deriveSubagentDisplayMeta(baseSubagent(), true)
    expect(meta.name).toBe('角色一致性校验')
    expect(meta.description).toBe('检查主角台词是否符合人设')
    expect(meta.statusKind).toBe('loading')
    expect(meta.statusLabel).toBe('运行中')
  })

  it('shows reasoning as current step when open', () => {
    const meta = deriveSubagentDisplayMeta(
      baseSubagent({
        logs: [
          {
            id: 'reasoning:turn:1',
            phase: 'reasoning',
            title: '',
            excerpt: '分析人设',
            turn: 1,
            reasoningOpen: true,
          },
        ],
        turn: 1,
        maxTurns: 5,
      }),
      true,
    )
    expect(meta.currentStep).toBe('编排中…')
    expect(meta.turnHint).toBe('第 1/5 轮')
  })

  it('marks done subagent as success without redundant step hint', () => {
    const meta = deriveSubagentDisplayMeta(
      baseSubagent({ status: 'done', logs: [] }),
      false,
    )
    expect(meta.statusKind).toBe('success')
    expect(meta.currentStep).toBeNull()
  })

  it('omits description when only a single-line title exists', () => {
    const meta = deriveSubagentDisplayMeta(
      baseSubagent({ description: '查看1-30章', status: 'done' }),
      false,
    )
    expect(meta.name).toBe('查看1-30章')
    expect(meta.description).toBe('')
  })

  it('exposes full output and tool stats when subagent completed', () => {
    const meta = deriveSubagentDisplayMeta(
      baseSubagent({
        status: 'done',
        summaryPreview: '## 章节概览\n\n共 112 章，前 16 章已抽检完成。',
        logs: [
          {
            id: '1',
            phase: 'tool_done',
            title: 'Read',
            tool: 'Read',
            status: 'completed',
            filePath: '/novel/n1/chapters/c1.md',
          },
        ],
      }),
      false,
    )
    expect(meta.fullOutput).toContain('112 章')
    expect(meta.toolStats).toContain('阅读')
  })
})
