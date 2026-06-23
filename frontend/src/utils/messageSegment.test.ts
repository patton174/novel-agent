import { describe, expect, it } from 'vitest'
import type { AgentTimelineBlock } from '../types/agent'
import {
  applyMessageSegmentEvent,
  collectDeliveryBlockIds,
  commitMessageSegmentToTimeline,
  extractDeliveryTextFromTimeline,
  initialMessageSegmentState,
  parseMessageDelivery,
} from './messageSegment'

describe('messageSegment', () => {
  it('accumulates delta in messageContent without timeline until completed', () => {
    let state = initialMessageSegmentState()
    state = applyMessageSegmentEvent(state, {
      type: 'message.started',
      sequence: 1,
      payload: { role: 'assistant' },
    })
    state = applyMessageSegmentEvent(state, {
      type: 'message.delta',
      sequence: 2,
      payload: { text: '执行说明\n\n' },
    })
    expect(state.messageContent).toContain('执行说明')
    expect(state.timeline).toHaveLength(0)
  })

  it('completed delivery:false commits orchestration block and clears buffer', () => {
    let state = initialMessageSegmentState()
    state = applyMessageSegmentEvent(state, {
      type: 'message.started',
      sequence: 1,
      payload: {},
    })
    state = applyMessageSegmentEvent(state, {
      type: 'message.delta',
      sequence: 2,
      payload: { text: '先读章节' },
    })
    state = applyMessageSegmentEvent(state, {
      type: 'message.completed',
      sequence: 3,
      step_id: 'msg-1',
      payload: { delivery: false },
    })
    expect(state.messageContent).toBe('')
    expect(state.segmentOpen).toBe(false)
    expect(state.timeline).toHaveLength(1)
    expect(state.timeline[0].kind === 'text' && state.timeline[0].delivery).toBe(false)
  })

  it('completed delivery:true commits reply block', () => {
    const timeline = commitMessageSegmentToTimeline([], '## 汇总\n\n正文', true, 'msg-2')
    expect(timeline[0].kind === 'text' && timeline[0].delivery).toBe(true)
    expect(extractDeliveryTextFromTimeline(timeline)).toContain('汇总')
    expect(collectDeliveryBlockIds(timeline).size).toBe(1)
  })

  it('legacy completed without delivery defaults to reply', () => {
    expect(parseMessageDelivery({ role: 'assistant' })).toBe(true)
  })
})
