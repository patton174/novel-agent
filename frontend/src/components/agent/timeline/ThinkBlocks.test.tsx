import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThinkBlock } from './ThinkBlocks'
import type { AgentTimelineBlock } from '../../../types/agent'

describe('ThinkBlock', () => {
  const block: Extract<AgentTimelineBlock, { kind: 'think' }> = {
    kind: 'think',
    id: 'think-1',
    text: '分析完成后的思考正文',
    stepId: 'step-think',
  }

  it('expands after auto-collapse when parent pins thinkExpanded=false', () => {
    const onThinkExpandedChange = vi.fn()
    const { getByTestId, queryByTestId, rerender } = render(
      <ThinkBlock
        block={block}
        messageKey="msg-1"
        streamLive={false}
        streamFinished
        thinkExpanded={false}
        onThinkExpandedChange={onThinkExpandedChange}
      />,
    )

    expect(queryByTestId('agent-think-content')).toBeNull()
    fireEvent.click(getByTestId('agent-think-toggle'))
    expect(onThinkExpandedChange).toHaveBeenCalledWith(true)
    expect(getByTestId('agent-think-content')).toBeInTheDocument()

    rerender(
      <ThinkBlock
        block={block}
        messageKey="msg-1"
        streamLive={false}
        streamFinished
        thinkExpanded
        onThinkExpandedChange={onThinkExpandedChange}
      />,
    )
    expect(getByTestId('agent-think-content')).toBeInTheDocument()
  })
})
