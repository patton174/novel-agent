import { describe, expect, it } from 'vitest'
import type { AgentEventEnvelope, AgentStepState } from '../types/agent'
import { applySubagentStepEvent } from './subagentStream'

const baseSteps: AgentStepState[] = [
  {
    stepId: 'parent-step',
    type: 'tool',
    status: 'started',
    title: '子任务：迁移',
    toolName: 'Agent',
  },
]

describe('applySubagentStepEvent', () => {
  it('tracks started and progress logs', () => {
    let steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.started',
      sequence: 1,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        description: '迁移第1-2章',
        child_run_id: 'child-1',
        max_turns: 20,
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.progress',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        phase: 'tool_done',
        tool: 'Write',
        title: '写入记忆',
        excerpt: '第1章完成',
        child_step_id: 'c-step-1',
      },
    } as AgentEventEnvelope)

    const sub = steps[0].subagent
    expect(sub?.status).toBe('active')
    expect(sub?.description).toBe('迁移第1-2章')
    expect(sub?.logs.length).toBeGreaterThanOrEqual(1)
  })

  it('parses chapter metadata from progress payload', () => {
    const steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.progress',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        phase: 'tool_done',
        tool: 'Read',
        title: '阅读章节',
        child_step_id: 'c-read-1',
        file_path: '/novel/n1/chapters/c1.md',
        result_labels: ['《第一章》'],
        display_excerpt: '《第一章》\n…',
      },
    } as AgentEventEnvelope)
    const log = steps[0].subagent?.logs.find((l) => l.phase === 'tool_done')
    expect(log?.filePath).toContain('chapters')
    expect(log?.resultLabels).toEqual(['《第一章》'])
  })

  it('accumulates reasoning into thinkText', () => {
    const steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.progress',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        phase: 'reasoning',
        snippet: '分析章节结构',
      },
    } as AgentEventEnvelope)
    expect(steps[0].subagent?.thinkText).toContain('分析章节结构')
  })

  it('streams output delta into summaryPreview', () => {
    const steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.progress',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        phase: 'output_delta',
        snippet: '## 章节概览\n',
      },
    } as AgentEventEnvelope)
    expect(steps[0].subagent?.summaryPreview).toBe('## 章节概览\n')
  })

  it('marks completed with summary', () => {
    const steps = applySubagentStepEvent(
      applySubagentStepEvent(baseSteps, {
        type: 'subagent.started',
        sequence: 1,
        step_id: 'parent-step',
        payload: { parent_step_id: 'parent-step', description: 'x' },
      } as AgentEventEnvelope),
      {
        type: 'subagent.completed',
        sequence: 3,
        step_id: 'parent-step',
        payload: {
          parent_step_id: 'parent-step',
          summary_preview: '全部完成',
        },
      } as AgentEventEnvelope,
    )
    expect(steps[0].subagent?.status).toBe('done')
    expect(steps[0].subagent?.summaryPreview).toContain('全部完成')
  })

  it('uses 审查 Agent title for review subagent_kind', () => {
    const steps = applySubagentStepEvent([], {
      type: 'subagent.started',
      sequence: 1,
      step_id: 'step_review_abc',
      payload: {
        parent_step_id: 'step_review_abc',
        description: '审查：全书连贯性与最近改动',
        subagent_kind: 'review',
      },
    } as AgentEventEnvelope)
    expect(steps[0]?.title).toBe('审查 Agent')
    expect(steps[0]?.detail).toBe('审查：全书连贯性与最近改动')
  })
})
