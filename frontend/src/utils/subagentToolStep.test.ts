import { describe, expect, it } from 'vitest'
import type { AgentSubagentLogEntry } from '../types/agent'
import { enrichSubagentToolLogs, subagentLogToStep } from './subagentToolStep'

describe('enrichSubagentToolLogs', () => {
  it('merges file_path and result_labels from tool_started into tool_done', () => {
    const logs: AgentSubagentLogEntry[] = [
      {
        id: 'tool_started:child-1',
        phase: 'tool_started',
        title: '阅读章节',
        tool: 'Read',
        filePath: '/novel/n1/chapters/c1.md',
        resultLabels: ['《第一章》'],
      },
      {
        id: 'tool_done:child-1',
        phase: 'tool_done',
        title: '阅读章节',
        tool: 'Read',
        excerpt: '《第一章》\n正文…',
      },
    ]
    const enriched = enrichSubagentToolLogs(logs)
    expect(enriched).toHaveLength(1)
    expect(enriched[0].filePath).toContain('/chapters/')
    expect(enriched[0].resultLabels).toEqual(['《第一章》'])
  })

  it('parses chapter title from excerpt when labels missing', () => {
    const logs: AgentSubagentLogEntry[] = [
      {
        id: 'tool_done:child-2',
        phase: 'tool_done',
        title: '写入章节',
        tool: 'Write',
        excerpt: '《第二章》已写入',
      },
    ]
    const enriched = enrichSubagentToolLogs(logs)
    expect(enriched[0].resultLabels).toEqual(['《第二章》'])
  })
})

describe('subagentLogToStep', () => {
  it('builds a timeline step with labels for TimelineToolBlock', () => {
    const entry: AgentSubagentLogEntry = {
      id: 'tool_done:child-1',
      phase: 'tool_done',
      title: '阅读章节',
      tool: 'Read',
      resultLabels: ['《序章》'],
      filePath: '/novel/n1/chapters/x.md',
    }
    const step = subagentLogToStep(entry, 'success')
    expect(step.toolName).toBe('Read')
    expect(step.resultLabels).toEqual(['《序章》'])
    expect(step.title).toBe('阅读章节')
  })
})
