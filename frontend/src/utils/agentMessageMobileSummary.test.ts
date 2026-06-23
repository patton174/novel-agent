import { describe, expect, it } from 'vitest'
import type { AgentTimelineBlock } from '../types/agent'
import type { EditorMessage } from '../types/editor'
import {
  countOrchestrationSteps,
  extractAssistantDeliveryText,
  extractPostTimelineDeliveryText,
} from './agentMessageMobileSummary'

describe('agentMessageMobileSummary', () => {
  it('prefers message.content for delivery text', () => {
    const message = { content: '最终答复', role: 'assistant' } as EditorMessage
    expect(extractAssistantDeliveryText(message, [])).toBe('最终答复')
  })

  it('falls back to trailing timeline delivery after last tool', () => {
    const message = { content: '', role: 'assistant' } as EditorMessage
    const timeline: AgentTimelineBlock[] = [
      { kind: 'narration', id: 'n1', content: '编排过程说明' },
      { kind: 'tool', id: 'tool:1', stepId: '1' },
      { kind: 'text', id: 't1', content: '最终答复' },
    ]
    expect(extractAssistantDeliveryText(message, timeline)).toBe('最终答复')
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

  it('suppresses post-timeline delivery while orchestration is still streaming', () => {
    const message = { content: '与编排区相同的正文', role: 'assistant' } as EditorMessage
    const timeline: AgentTimelineBlock[] = [
      { kind: 'narration', id: 'n1', content: '与编排区相同的正文' },
      { kind: 'tool', id: 'tool:1', stepId: '1' },
    ]
    const steps = [{ type: 'tool', toolName: 'ReadMemory', stepId: '1', status: 'started' }] as never
    expect(extractPostTimelineDeliveryText(message, timeline, steps, false)).toBe('')
  })

  it('suppresses duplicate delivery when stream finished and segment already carries text', () => {
    const message = { content: '最终交付表格', role: 'assistant' } as EditorMessage
    const timeline: AgentTimelineBlock[] = [
      { kind: 'tool', id: 'tool:1', stepId: '1' },
      { kind: 'text', id: 'text-1', content: '最终交付表格' },
    ]
    const steps = [{ type: 'tool', toolName: 'ReadMemory', stepId: '1', status: 'completed' }] as never
    expect(extractPostTimelineDeliveryText(message, timeline, steps, true)).toBe('')
  })

  it('keeps post-timeline delivery for plain assistant without orchestration', () => {
    const message = { content: '简单回复', role: 'assistant' } as EditorMessage
    expect(extractPostTimelineDeliveryText(message, [], [], true)).toBe('简单回复')
  })
})
