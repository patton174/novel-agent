import { describe, expect, it } from 'vitest'
import type { AgentSubagentLogEntry } from '../types/agent'
import { buildSubagentOrchestration } from './subagentOrchestration'
import { thinkRoundInsightBlocks, thinkRoundToolBlocks } from './agentStreamTimeline'

describe('buildSubagentOrchestration', () => {
  it('groups reasoning and tools into think rounds like main agent', () => {
    const logs: AgentSubagentLogEntry[] = [
      {
        id: 'reasoning:turn:1',
        phase: 'reasoning',
        title: '',
        excerpt: '先读记忆',
        turn: 1,
        reasoningOpen: false,
      },
      {
        id: 'tool_done:c1',
        phase: 'tool_done',
        title: '查阅创作记忆',
        tool: 'Read',
        resultLabels: ['《第一章》'],
      },
      { id: '_turn:2', phase: '_turn', title: '', turn: 2 },
      {
        id: 'reasoning:turn:2',
        phase: 'reasoning',
        title: '',
        excerpt: '再写入',
        turn: 2,
        reasoningOpen: false,
      },
      {
        id: 'tool_done:c2',
        phase: 'tool_done',
        title: '写入创作记忆',
        tool: 'Write',
        resultLabels: ['《第二章》'],
      },
    ]
    const { rounds, stepStates } = buildSubagentOrchestration(logs, {
      runActive: false,
    })
    expect(rounds.length).toBe(2)
    expect(thinkRoundInsightBlocks(rounds[0])[0]?.kind).toBe('reasoning')
    if (thinkRoundInsightBlocks(rounds[0])[0]?.kind === 'reasoning') {
      expect(thinkRoundInsightBlocks(rounds[0])[0].text).toContain('先读记忆')
      expect(thinkRoundInsightBlocks(rounds[0])[0].status).toBe('done')
    }
    expect(thinkRoundToolBlocks(rounds[0])).toHaveLength(1)
    expect(thinkRoundToolBlocks(rounds[1])).toHaveLength(1)
    expect(stepStates).toHaveLength(2)
    expect(stepStates[0].resultLabels).toEqual(['《第一章》'])
  })

  it('falls back to merged thinkText when no reasoning logs', () => {
    const logs: AgentSubagentLogEntry[] = [
      {
        id: 'tool_done:c1',
        phase: 'tool_done',
        title: '列举',
        tool: 'Glob',
      },
    ]
    const { rounds } = buildSubagentOrchestration(logs, {
      runActive: false,
      fallbackThinkText: '检查目录',
    })
    expect(rounds).toHaveLength(1)
    expect(thinkRoundInsightBlocks(rounds[0])[0]?.kind).toBe('think')
    if (thinkRoundInsightBlocks(rounds[0])[0]?.kind === 'think') {
      expect(thinkRoundInsightBlocks(rounds[0])[0].text).toContain('检查目录')
    }
    expect(thinkRoundToolBlocks(rounds[0])).toHaveLength(1)
  })
})
