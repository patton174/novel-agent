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
  it('streams child tool events into subagent timeline', () => {
    let steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.started',
      sequence: 1,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        description: '迁移第1-2章',
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.event',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        child_type: 'tool.started',
        child_step_id: 'c-step-1',
        child_payload: { name: 'ReadChapter', display_name: '阅读章节' },
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.event',
      sequence: 3,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        child_type: 'tool.completed',
        child_step_id: 'c-step-1',
        child_payload: {
          name: 'ReadChapter',
          display_name: '阅读章节',
          display_excerpt: '《第一章》',
          result_labels: ['《第一章》'],
        },
      },
    } as AgentEventEnvelope)

    const sub = steps[0].subagent
    expect(sub?.timeline?.some((b) => b.kind === 'tool')).toBe(true)
    expect(sub?.childStepStates?.[0]?.toolName).toBe('ReadChapter')
    expect(sub?.childStepStates?.[0]?.resultLabels).toEqual(['《第一章》'])
  })

  it('keeps child reasoning.delta in reasoning timeline', () => {
    let steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.started',
      sequence: 1,
      step_id: 'parent-step',
      payload: { parent_step_id: 'parent-step', description: '总结' },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.event',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        child_type: 'reasoning.delta',
        child_step_id: 'reason-1',
        child_payload: { text: '分析目录结构' },
      },
    } as AgentEventEnvelope)

    const sub = steps[0].subagent
    expect(sub?.timeline?.some((b) => b.kind === 'reasoning')).toBe(true)
    expect(sub?.timeline?.some((b) => b.kind === 'text' && b.content?.includes('分析目录'))).toBe(
      false,
    )
  })

  it('streams child message events into subagent timeline', () => {
    let steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.started',
      sequence: 1,
      step_id: 'parent-step',
      payload: { parent_step_id: 'parent-step', description: '总结' },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.event',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        child_type: 'message.delta',
        child_step_id: 'msg-1',
        child_payload: { text: '## 报告\n\n完成。' },
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.event',
      sequence: 3,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        child_type: 'message.completed',
        child_step_id: 'msg-1',
        child_payload: { role: 'assistant' },
      },
    } as AgentEventEnvelope)

    const text = steps[0].subagent?.timeline?.find((b) => b.kind === 'text')
    expect(text?.content).toContain('报告')
  })

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

  it('completed prefers longest summary when timeline already has streamed text', () => {
    let steps = applySubagentStepEvent(baseSteps, {
      type: 'subagent.started',
      sequence: 1,
      step_id: 'parent-step',
      payload: { parent_step_id: 'parent-step', description: '汇总' },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.event',
      sequence: 2,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        child_type: 'message.delta',
        child_step_id: 'msg-1',
        child_payload: { text: '短流式片段' },
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.progress',
      sequence: 3,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        phase: 'output_delta',
        snippet: '短流式片段',
      },
    } as AgentEventEnvelope)

    steps = applySubagentStepEvent(steps, {
      type: 'subagent.completed',
      sequence: 4,
      step_id: 'parent-step',
      payload: {
        parent_step_id: 'parent-step',
        summary_preview: '完整 Markdown 汇总正文比流式片段更长',
      },
    } as AgentEventEnvelope)

    expect(steps[0].subagent?.summaryPreview).toBe(
      '完整 Markdown 汇总正文比流式片段更长',
    )
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
