import { describe, expect, it } from 'vitest'
import type { AgentTimelineBlock } from '../types/agent'
import type { EditorMessage } from '../types/editor'
import {
  countOrchestrationSteps,
  extractAssistantDeliveryText,
} from './agentMessageMobileSummary'

describe('agentMessageMobileSummary', () => {
  it('prefers message.content for delivery text', () => {
    const message = { content: '最终答复', role: 'assistant' } as EditorMessage
    expect(extractAssistantDeliveryText(message, [])).toBe('最终答复')
  })

  it('falls back to timeline text blocks', () => {
    const message = { content: '', role: 'assistant' } as EditorMessage
    const timeline: AgentTimelineBlock[] = [
      { kind: 'text', id: 't1', content: '第一段' },
      { kind: 'text', id: 't2', content: '第二段' },
    ]
    expect(extractAssistantDeliveryText(message, timeline)).toBe('第一段第二段')
  })

  it('counts visible tool steps', () => {
    expect(
      countOrchestrationSteps(
        [
          { type: 'tool', toolName: 'ReadChapter', stepId: '1', status: 'completed' },
          { type: 'tool', toolName: 'output', stepId: '2', status: 'completed' },
        ] as never,
        [],
      ),
    ).toBe(1)
  })
})
