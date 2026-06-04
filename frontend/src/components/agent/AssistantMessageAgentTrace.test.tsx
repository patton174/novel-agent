import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssistantMessageAgentTrace } from './AssistantMessageAgentTrace'

describe('AssistantMessageAgentTrace', () => {
  it('renders tool steps with Chinese title and choice cards', () => {
    const onSelectChoice = vi.fn()
    render(
      <AssistantMessageAgentTrace
        stepStates={[
          {
            stepId: 'step-1',
            type: 'tool',
            status: 'completed',
            title: '生成创作方向',
            toolName: 'choose',
            choices: [
              { id: 'opt-1', title: '科幻未来', description: '探索科技伦理' },
              { id: 'opt-2', title: '悬疑推理', description: '谜题与反转' },
            ],
          },
        ]}
        onSelectChoice={onSelectChoice}
      />,
    )

    expect(screen.getByText('生成创作方向')).toBeInTheDocument()
    expect(screen.getByText('科幻未来')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('agent-choice-opt-1'))
    expect(onSelectChoice).toHaveBeenCalledWith(
      expect.objectContaining({ title: '科幻未来' }),
    )
  })

  it('shows spinner only on the running tool step', () => {
    render(
      <AssistantMessageAgentTrace
        isStreaming
        stepStates={[
          {
            stepId: 'step-1',
            type: 'tool',
            status: 'started',
            title: '撰写正文',
          },
        ]}
      />,
    )

    expect(screen.getByTestId('agent-trace-step-spinner')).toBeInTheDocument()
    expect(screen.queryByText('正在处理…')).not.toBeInTheDocument()
    expect(screen.queryByText('执行追踪')).not.toBeInTheDocument()
  })

  it('shows thinking row before tools start', () => {
    render(
      <AssistantMessageAgentTrace
        isStreaming
        isThinking
        stepStates={[]}
      />,
    )

    expect(screen.getByTestId('agent-think-panel')).toBeInTheDocument()
    expect(screen.getByText('思考')).toBeInTheDocument()
    expect(screen.getByText('进行中')).toBeInTheDocument()
  })

  it('toggles think section via controlled expand', () => {
    const onThinkExpandedChange = vi.fn()
    const { getByTestId, queryByText, rerender } = render(
      <AssistantMessageAgentTrace
        thinkText="正在分析用户的写作意图"
        thinkExpanded={false}
        onThinkExpandedChange={onThinkExpandedChange}
      />,
    )

    expect(queryByText('正在分析用户的写作意图')).not.toBeInTheDocument()
    fireEvent.click(getByTestId('agent-think-toggle'))
    expect(onThinkExpandedChange).toHaveBeenCalledWith(true)

    rerender(
      <AssistantMessageAgentTrace
        thinkText="正在分析用户的写作意图"
        thinkExpanded
        onThinkExpandedChange={onThinkExpandedChange}
      />,
    )
    expect(queryByText('正在分析用户的写作意图')).toBeInTheDocument()
  })
})
