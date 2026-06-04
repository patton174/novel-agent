import { describe, expect, it } from 'vitest'
import { formatSubagentLogLabel, visibleSubagentLogs } from './subagentLogLabel'
import type { AgentSubagentLogEntry } from '../types/agent'

describe('formatSubagentLogLabel', () => {
  it('maps Read/Write tools to chapter labels', () => {
    expect(
      formatSubagentLogLabel({
        id: '1',
        phase: 'tool_done',
        tool: 'Read',
        title: 'Read /chapters/x.md',
      }),
    ).toBe('阅读章节')
    expect(
      formatSubagentLogLabel({
        id: '2',
        phase: 'tool_done',
        tool: 'Write',
        title: 'Write /memory/chapter/u.json',
      }),
    ).toBe('写入创作记忆')
  })

  it('hides tool_started when tool_done exists', () => {
    const logs: AgentSubagentLogEntry[] = [
      { id: 'tool_started:abc', phase: 'tool_started', tool: 'Read' },
      { id: 'tool_done:abc', phase: 'tool_done', tool: 'Read', status: 'completed' },
    ]
    expect(visibleSubagentLogs(logs)).toHaveLength(1)
    expect(visibleSubagentLogs(logs)[0].phase).toBe('tool_done')
  })
})
