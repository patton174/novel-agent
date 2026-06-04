import { describe, expect, it } from 'vitest'
import { buildAgentHistory, expandMessagesForAgentHistory } from './buildAgentHistory'

describe('buildAgentHistory', () => {
  it('includes recent user and assistant turns', () => {
    const history = buildAgentHistory([
      { role: 'user', content: '继续写' },
      { role: 'assistant', content: '请选择一个方向。' },
    ])
    expect(history).toHaveLength(2)
    expect(history[1].content).toBe('请选择一个方向。')
  })

  it('includes ask_user choice_selected from assistant timeline', () => {
    const history = buildAgentHistory([
      {
        role: 'assistant',
        content: '请回答以下问题',
        agentTimeline: [
          {
            kind: 'choice_selected',
            id: 'choice-selected-ask_user',
            stepId: 'step-ask-1',
            title: '我的回答：\n独行者；霜倾颜',
          },
        ],
        agentSteps: [
          {
            stepId: 'step-ask-1',
            type: 'tool',
            status: 'completed',
            toolName: 'AskUser',
          },
        ],
      },
    ])
    expect(history.some((row) => row.role === 'user' && row.content.includes('独行者'))).toBe(true)
  })

  it('skips choice_selected without a verified AskUser step', () => {
    const history = buildAgentHistory([
      {
        role: 'assistant',
        content: '分析中',
        agentTimeline: [
          {
            kind: 'choice_selected',
            id: 'choice-selected-fake',
            title: '虚界降临1年',
          },
        ],
      },
    ])
    expect(history.some((row) => row.role === 'user')).toBe(false)
  })

  it('does not use agentThinkText as assistant history content', () => {
    const history = buildAgentHistory([
      {
        role: 'assistant',
        content: '',
        agentThinkText: '编排推理：用户已选择虚界降临1年',
      },
    ])
    expect(history).toHaveLength(0)
  })

  it('expandMessagesForAgentHistory preserves order', () => {
    const rows = expandMessagesForAgentHistory([
      {
        role: 'assistant',
        content: '提问',
        agentTimeline: [{ kind: 'choice_selected', id: 'c1', stepId: 's1', title: '选A' }],
        agentSteps: [{ stepId: 's1', type: 'tool', status: 'completed', toolName: 'AskUser' }],
      },
      { role: 'assistant', content: '收到' },
    ])
    expect(rows[0].content).toContain('选A')
    expect(rows[1].content).toBe('提问')
  })

  it('includes completed tool summaries when assistant content is empty', () => {
    const history = buildAgentHistory([
      { role: 'user', content: '写第一章' },
      {
        role: 'assistant',
        content: '',
        agentSteps: [
          {
            stepId: 's1',
            type: 'tool',
            status: 'completed',
            toolName: 'Write',
            outputSummary: '已写入《初入江湖》约 1200 字',
          },
        ],
      },
    ])
    expect(history).toHaveLength(2)
    expect(history[1].role).toBe('assistant')
    expect(history[1].content).toContain('已写入')
  })

  it('includes result_labels when outputSummary is absent', () => {
    const history = buildAgentHistory([
      { role: 'user', content: '查角色' },
      {
        role: 'assistant',
        content: '',
        agentSteps: [
          {
            stepId: 's1',
            type: 'tool',
            status: 'completed',
            toolName: 'memory_read',
            resultLabels: ['张三', '李四'],
          },
        ],
      },
    ])
    expect(history).toHaveLength(2)
    expect(history[1].content).toContain('张三')
  })

  it('skips onboarding welcome assistant turn', () => {
    const history = buildAgentHistory([
      {
        role: 'assistant',
        content: '你好！当前正在创作《测试书》，描述场景、人物或情节即可开始。',
      },
      { role: 'user', content: '写开篇' },
    ])
    expect(history).toHaveLength(0)
  })

  it('keeps repeated user turns with same wording', () => {
    const history = buildAgentHistory(
      [
        { role: 'user', content: '继续' },
        { role: 'assistant', content: '好的，已续写。' },
        { role: 'user', content: '继续' },
      ],
      { excludeTrailingUser: false },
    )
    expect(history.filter((row) => row.role === 'user' && row.content === '继续')).toHaveLength(2)
  })
})
