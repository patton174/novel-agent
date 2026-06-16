import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AgentThinkPanel } from './AgentThinkPanel'

describe('AgentThinkPanel', () => {
  it('shows think row while thinking', () => {
    const { getByTestId } = render(<AgentThinkPanel isThinking text="" />)
    expect(getByTestId('agent-think-toggle')).toHaveTextContent('思考')
    expect(getByTestId('agent-think-toggle')).toHaveTextContent('进行中')
    expect(getByTestId('timeline-lead-icon')).toHaveAttribute('data-status', 'loading')
    expect(document.querySelector('[data-tool-icon="think"]')).not.toBeNull()
  })

  it('shows completed status and hides body when collapsed', () => {
    const { getByTestId, queryByTestId } = render(
      <AgentThinkPanel
        isThinking={false}
        text="分析完成"
        durationSec={3}
        expanded={false}
        autoCollapseWhenDone
      />,
    )
    expect(getByTestId('agent-think-toggle')).toHaveTextContent('思考')
    expect(getByTestId('agent-think-toggle')).toHaveTextContent('已完成 · 3 秒')
    expect(queryByTestId('agent-think-content')).toBeNull()
  })

  it('shows body when expanded after done', () => {
    const { getByTestId } = render(
      <AgentThinkPanel
        isThinking={false}
        text="分析完成"
        durationSec={3}
        expanded
        autoCollapseWhenDone
      />,
    )
    expect(getByTestId('agent-think-content')).toHaveTextContent('分析完成')
  })

  it('toggles body on header click', () => {
    const onExpanded = vi.fn()
    const { getByTestId } = render(
      <AgentThinkPanel
        isThinking={false}
        text="一行思考"
        expanded={false}
        onExpandedChange={onExpanded}
      />,
    )
    fireEvent.click(getByTestId('agent-think-toggle'))
    expect(onExpanded).toHaveBeenCalledWith(true)
  })

  it('shows elapsed seconds while thinking', async () => {
    vi.useFakeTimers()
    const { getByTestId } = render(<AgentThinkPanel isThinking text="分析中" />)
    expect(getByTestId('agent-think-toggle')).toHaveTextContent('进行中')
    await vi.advanceTimersByTimeAsync(3100)
    expect(getByTestId('agent-think-toggle')).toHaveTextContent('3 秒')
    vi.useRealTimers()
  })

  it('keeps think header in round when body was moved to orchestration summary', () => {
    const { getByTestId, queryByTestId } = render(
      <AgentThinkPanel
        isThinking={false}
        text=""
        inThinkRound
        leadId="think-rail-only"
        durationSec={2}
      />,
    )
    expect(getByTestId('agent-think-toggle')).toHaveTextContent('思考')
    expect(document.querySelector('[data-think-lead-id="think-rail-only"]')).not.toBeNull()
    expect(queryByTestId('agent-think-content')).toBeNull()
  })
})
