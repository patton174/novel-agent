import { describe, expect, it } from 'vitest'
import type { AgentSubagentLogEntry } from '../types/agent'
import {
  deriveSubagentLiveLines,
  formatSubagentToolStats,
} from './subagentActivity'
import type { AgentSubagentState } from '../types/agent'

describe('subagentActivity', () => {
  it('formats tool stats like cursor summary', () => {
    const logs: AgentSubagentLogEntry[] = [
      {
        id: '1',
        phase: 'tool_done',
        title: 'Read',
        tool: 'Read',
        status: 'completed',
        filePath: '/novel/n1/chapters/c1.md',
      },
      {
        id: '2',
        phase: 'tool_done',
        title: 'Read',
        tool: 'Read',
        status: 'completed',
        filePath: '/novel/n1/chapters/c2.md',
      },
      {
        id: '3',
        phase: 'tool_done',
        title: 'Write',
        tool: 'Write',
        status: 'completed',
        filePath: '/novel/n1/chapters/c3.md',
      },
    ]
    expect(formatSubagentToolStats(logs)).toBe('阅读 2 章，写入 1 章')
  })

  it('builds live lines while running', () => {
    const sub: AgentSubagentState = {
      description: '查看第1-4章',
      status: 'active',
      logs: [
        {
          id: 'tool_done:1',
          phase: 'tool_done',
          title: 'Read',
          tool: 'Read',
          status: 'completed',
          resultLabels: ['《第一章》'],
        },
        {
          id: 'tool_started:2',
          phase: 'tool_started',
          title: 'Read',
          tool: 'Read',
          status: 'started',
        },
      ],
    }
    const lines = deriveSubagentLiveLines(sub, true)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.some((l) => l.includes('阅读') || l.includes('章节'))).toBe(true)
  })
})
