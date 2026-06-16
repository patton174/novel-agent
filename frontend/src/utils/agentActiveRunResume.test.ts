import { describe, expect, it } from 'vitest'
import { createInitialAgentStreamUiState } from './agentStreamState'
import {
  applyStoredRunEvents,
  maxStoredEventSequence,
  shouldFollowRunLiveEvents,
} from './agentActiveRunResume'

describe('agentActiveRunResume', () => {
  it('applies stored events in sequence order', () => {
    const state = applyStoredRunEvents(createInitialAgentStreamUiState(), [
      {
        sequence: 2,
        payloadJson: JSON.stringify({
          event_id: 'evt_b',
          type: 'message.delta',
          sequence: 2,
          payload: { text: ' world' },
        }),
      },
      {
        sequence: 1,
        payloadJson: JSON.stringify({
          event_id: 'evt_a',
          type: 'message.delta',
          sequence: 1,
          payload: { text: 'hello' },
        }),
      },
    ])
    expect(state.messageContent).toBe('helloworld')
  })

  it('tracks max stored sequence', () => {
    expect(
      maxStoredEventSequence([
        { sequence: 1 },
        { sequence: 5 },
        { sequence: 3 },
      ]),
    ).toBe(5)
  })

  it('follows live events while run is active', () => {
    const active = {
      ...createInitialAgentStreamUiState(),
      runId: 'run_1',
    }
    expect(shouldFollowRunLiveEvents(active)).toBe(true)
    expect(
      shouldFollowRunLiveEvents({
        ...active,
        runTerminalAck: true,
        isStreamEnded: true,
      }),
    ).toBe(false)
  })
})
