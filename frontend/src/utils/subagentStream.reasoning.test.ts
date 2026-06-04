import { describe, expect, it } from 'vitest'
import type { AgentEventEnvelope, AgentStepState } from '../types/agent'
import { applySubagentStepEvent } from './subagentStream'

const baseSteps: AgentStepState[] = [
  {
    stepId: 'parent-step',
    type: 'tool',
    status: 'started',
    title: '子 Agent',
    toolName: 'Agent',
  },
]

describe('subagent reasoning logs', () => {
  it('appends deltas to one reasoning block per turn', () => {
    let steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.started',
      sequence: 1,
      step_id: 'parent-step',
      payload: { parent_step_id: 'parent-step', description: 'x' },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.progress',
      sequence: 2,
      payload: {
        parent_step_id: 'parent-step',
        phase: 'reasoning_start',
        turn: 1,
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.progress',
      sequence: 3,
      payload: {
        parent_step_id: 'parent-step',
        phase: 'reasoning',
        snippet: '## 计划\n',
        turn: 1,
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.progress',
      sequence: 4,
      payload: {
        parent_step_id: 'parent-step',
        phase: 'reasoning',
        snippet: '先读章节记忆',
        turn: 1,
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.progress',
      sequence: 5,
      payload: {
        parent_step_id: 'parent-step',
        phase: 'reasoning_end',
        turn: 1,
      },
    } as AgentEventEnvelope)

    const logs = steps[0].subagent?.logs ?? []
    const reasoning = logs.filter((l) => l.phase === 'reasoning')
    expect(reasoning).toHaveLength(1)
    expect(reasoning[0].excerpt).toContain('## 计划')
    expect(reasoning[0].excerpt).toContain('先读章节记忆')
    expect(reasoning[0].reasoningOpen).toBe(false)
  })
})
