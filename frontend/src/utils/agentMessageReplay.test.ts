import { describe, expect, it } from 'vitest'
import {
  ensureReplayTimeline,
  hasAgentTrace,
  mergeRemoteWithLocalTrace,
} from './agentMessageReplay'
import type { PersistableAssistantMessage } from './agentMessagePersist'

function assistant(overrides: Partial<PersistableAssistantMessage>): PersistableAssistantMessage {
  return {
    id: 'a1',
    role: 'assistant',
    content: '正文内容',
    timestamp: new Date('2026-05-29T10:00:00Z'),
    ...overrides,
  }
}

describe('hasAgentTrace', () => {
  it('detects think text and tool steps', () => {
    expect(hasAgentTrace(assistant({ content: 'only text' }))).toBe(false)
    expect(hasAgentTrace(assistant({ agentThinkText: '思考中…' }))).toBe(true)
    expect(
      hasAgentTrace(
        assistant({
          agentSteps: [{ type: 'tool', stepId: 's1', toolName: 'choose', status: 'completed', title: '选择方向' }],
        }),
      ),
    ).toBe(true)
  })
})

describe('ensureReplayTimeline', () => {
  it('rebuilds timeline from persisted trace fields', () => {
    const blocks = ensureReplayTimeline(
      assistant({
        agentThinkText: '先分析题材',
        agentSteps: [
          { type: 'tool', stepId: 's1', toolName: 'choose', status: 'completed', title: '选择方向' },
        ],
      }),
    )
    expect(blocks.some((b) => b.kind === 'think')).toBe(true)
    expect(blocks.some((b) => b.kind === 'tool')).toBe(true)
    expect(blocks.some((b) => b.kind === 'text')).toBe(true)
  })
})

describe('mergeRemoteWithLocalTrace', () => {
  it('merges trace when remote id differs from local', () => {
    const local = [
      assistant({
        id: 'local-1',
        agentThinkText: '本地思考',
        agentSteps: [
          { type: 'tool', stepId: 's1', toolName: 'memory_patch', status: 'completed', title: '更新记忆' },
        ],
      }),
    ]
    const remote = [
      {
        id: 'server-1',
        role: 'assistant' as const,
        content: '正文内容',
        timestamp: new Date('2026-05-29T10:00:01Z'),
      },
    ]
    const merged = mergeRemoteWithLocalTrace(remote, local)
    expect(merged[0].agentThinkText).toBe('本地思考')
    expect(merged[0].agentSteps?.[0].toolName).toBe('memory_patch')
  })
})
