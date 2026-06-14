import { describe, expect, it } from 'vitest'
import { orchestrationCompletedTitle, plannedToolCallsFromPayload } from './agentOrchestration'

describe('orchestrationCompletedTitle', () => {
  it('uses backend title when specific', () => {
    expect(
      orchestrationCompletedTitle({ title: '写入章节', tool_calls: [{ tool: 'Write' }] }),
    ).toBe('写入章节')
  })

  it('formats parallel partition batch', () => {
    expect(
      orchestrationCompletedTitle({
        title: '编排中…',
        tool_calls: [{ tool: 'Read' }, { tool: 'Glob' }],
        partition: [{ parallel: true, tools: ['Read', 'Glob'] }],
      }),
    ).toBe('并行 · 读取、列举')
  })

  it('formats serial partition batches with arrow', () => {
    expect(
      orchestrationCompletedTitle({
        tool_calls: [{ tool: 'Glob' }, { tool: 'Write' }],
        partition: [
          { parallel: false, tools: ['Glob'] },
          { parallel: false, tools: ['Write'] },
        ],
      }),
    ).toBe('列举 → 写入')
  })

  it('supports legacy tool names in partition', () => {
    expect(
      orchestrationCompletedTitle({
        tool_calls: [{ tool: 'memory_read' }, { tool: 'chapter_list' }],
        partition: [{ parallel: true, tools: ['memory_read', 'chapter_list'] }],
      }),
    ).toBe('并行 · 读取、列举')
  })

  it('hides output/end from batch headline', () => {
    expect(
      orchestrationCompletedTitle({
        tool_calls: [{ tool: 'output' }],
        partition: [{ parallel: false, tools: ['output'] }],
      }),
    ).toBeUndefined()
  })
})

describe('plannedToolCallsFromPayload', () => {
  it('preserves tool_call_id for early UI rows', () => {
    expect(
      plannedToolCallsFromPayload(
        {
          tool_calls: [
            { tool: 'WriteChapter', tool_call_id: 'call_abc', input: { title: '第一章' } },
          ],
        },
        'step-plan',
      ),
    ).toEqual([
      {
        tool: 'WriteChapter',
        toolCallId: 'call_abc',
        input: { title: '第一章' },
      },
    ])
  })
})
