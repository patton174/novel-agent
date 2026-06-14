import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AssistantStreamTimeline } from '../components/agent/AssistantStreamTimeline'
import {
  applyAgentEvent,
  createInitialAgentStreamUiState,
} from '../utils/agentStreamState'

/** Mirrors EditorPage: persisted trace uses timeline + stepStates (not legacy thinkText-only trace). */
function renderPersistedAssistantTimeline(
  timeline: ReturnType<typeof createInitialAgentStreamUiState>['timeline'],
  stepStates: ReturnType<typeof createInitialAgentStreamUiState>['stepStates'],
  thinkExpanded?: boolean,
) {
  return render(
    <AssistantStreamTimeline
      timeline={timeline}
      stepStates={stepStates}
      streamLive={false}
      streamFinished
      messageKey="stream-test"
      thinkExpanded={thinkExpanded}
      pinOrchestrationOpen
    />,
  )
}

describe('EditorPage agent stream mapping', () => {
  it('reduces standard events into message-persisted trace fields', () => {
    const events: Array<[string, string]> = [
      [
        'agent-event',
        JSON.stringify({
          type: 'think.delta',
          step_id: 'step-think',
          payload: { text: '正在分析用户的写作意图' },
        }),
      ],
      [
        'agent-event',
        JSON.stringify({
          type: 'tool.started',
          step_id: 'step-tool',
          payload: { name: '检索素材库' },
        }),
      ],
      ['stream-end', 'done'],
    ]

    let state = createInitialAgentStreamUiState()
    for (const [eventName, rawData] of events) {
      state = applyAgentEvent(state, eventName, rawData)
    }

    const thinkBlock = state.timeline.find((b) => b.kind === 'think')
    expect(thinkBlock?.kind === 'think' && thinkBlock.text).toContain('正在分析用户的写作意图')
    expect(state.stepStates).toHaveLength(1)
    expect(state.isStreamEnded).toBe(true)
  })

  it('keeps timeline think payload and tool trace after stream ends', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'think.delta',
        payload: { text: '正在分析用户的写作意图' },
      }),
    )
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'tool.started',
        step_id: 'step-tool',
        payload: { name: '检索素材库' },
      }),
    )
    state = applyAgentEvent(state, 'stream-end', 'done')

    const thinkBlock = state.timeline.find((b) => b.kind === 'think')
    expect(thinkBlock?.kind === 'think' && thinkBlock.text).toContain('正在分析用户的写作意图')
    expect(state.stepStates[0]?.title).toBe('检索素材库')

    const timeline = state.timeline.length > 0 ? state.timeline : []
    const stepStates = state.stepStates.length > 0 ? state.stepStates : []

    renderPersistedAssistantTimeline(timeline, stepStates, false)
    expect(screen.getByTestId('agent-stream-timeline')).toBeInTheDocument()
    expect(screen.getByText('检索素材库')).toBeInTheDocument()
  })
})
