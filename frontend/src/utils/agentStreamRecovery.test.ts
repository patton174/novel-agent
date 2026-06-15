import { describe, expect, it } from 'vitest'
import { createInitialAgentStreamUiState } from './agentStreamState'
import {
  isPeerDroppedStreamError,
  shouldAttachStreamRecovery,
} from './agentStreamRecovery'

describe('agentStreamRecovery', () => {
  it('detects peer dropped errors', () => {
    expect(isPeerDroppedStreamError('peer closed connection without sending complete message body')).toBe(
      true,
    )
    expect(isPeerDroppedStreamError('net::ERR_HTTP2_PROTOCOL_ERROR')).toBe(true)
    expect(isPeerDroppedStreamError('NetworkError when attempting to fetch resource.')).toBe(true)
  })

  it('requests recovery while run is active', () => {
    const state = {
      ...createInitialAgentStreamUiState(),
      runId: 'run_1',
    }
    expect(shouldAttachStreamRecovery(state)).toBe(true)
  })

  it('skips recovery after terminal ack', () => {
    const state = {
      ...createInitialAgentStreamUiState(),
      runId: 'run_1',
      runTerminalAck: true,
      isStreamEnded: true,
    }
    expect(shouldAttachStreamRecovery(state)).toBe(false)
  })
})
