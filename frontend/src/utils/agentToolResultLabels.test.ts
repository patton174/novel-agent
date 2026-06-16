import { describe, expect, it } from 'vitest'
import { parseMemoryReadTitles } from './agentToolResultLabels'
import {
  collapseConsecutiveMemoryReads,
  pruneRedundantChoiceSelected,
} from './agentTimelineToolCollapse'
import type { AgentStepState, AgentTimelineBlock } from '../types/agent'

describe('parseMemoryReadTitles', () => {
  it('extracts keys from bullet lines', () => {
    const text = `世界观记忆：
- 力量体系: 灵气修炼
- 地理层级: 三界九域`
    expect(parseMemoryReadTitles(text)).toEqual(['力量体系', '地理层级'])
  })

  it('extracts character roster names', () => {
    const text = '角色库共 2 人：张三、李四\n- 张三: 穿越者'
    expect(parseMemoryReadTitles(text)).toContain('张三')
    expect(parseMemoryReadTitles(text)).toContain('李四')
  })
})

describe('collapseConsecutiveMemoryReads', () => {
  it('keeps each read tool as its own timeline block', () => {
    const blocks: AgentTimelineBlock[] = [
      { kind: 'tool', id: 't1', stepId: 's1' },
      { kind: 'tool', id: 't2', stepId: 's2' },
      { kind: 'tool', id: 't3', stepId: 's3' },
    ]
    const stepByBlockId = new Map<string, AgentStepState>([
      [
        't1',
        {
          stepId: 's1',
          type: 'tool',
          status: 'completed',
          title: '读取记忆',
          toolName: 'memory_read',
          resultLabels: ['力量体系'],
        },
      ],
      [
        't2',
        {
          stepId: 's2',
          type: 'tool',
          status: 'completed',
          title: '读取记忆',
          toolName: 'memory_read',
          resultLabels: ['地理层级'],
        },
      ],
      [
        't3',
        {
          stepId: 's3',
          type: 'tool',
          status: 'completed',
          title: '写入记忆',
          toolName: 'memory_update',
        },
      ],
    ])
    const { blocks: out, mergedMemoryReadTitles, mergedMemoryReadCount } =
      collapseConsecutiveMemoryReads(blocks, stepByBlockId)
    expect(out.map((b) => b.id)).toEqual(['t1', 't2', 't3'])
    expect(mergedMemoryReadTitles.get('t1')).toEqual(['力量体系'])
    expect(mergedMemoryReadTitles.get('t2')).toEqual(['地理层级'])
    expect(mergedMemoryReadCount.size).toBe(0)
  })
})

describe('pruneRedundantChoiceSelected', () => {
  it('drops orphan choice when already shown under ask_user tool', () => {
    const timeline: AgentTimelineBlock[] = [
      { kind: 'tool', id: 'tool-1', stepId: 'step-ask' },
      {
        kind: 'choice_selected',
        id: 'c1',
        title: '我的回答：\nQ1：A1',
      },
    ]
    const pruned = pruneRedundantChoiceSelected(timeline)
    expect(pruned.some((b) => b.kind === 'choice_selected')).toBe(false)
  })
})
