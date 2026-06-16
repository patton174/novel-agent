import { describe, expect, it } from 'vitest'
import { createInitialAgentStreamUiState } from './agentStreamState'
import {
  clearStreamRecoveryBanner,
  isPeerDroppedStreamError,
  isStreamRecoveryBanner,
  shouldAttachStreamRecovery,
  STREAM_RECOVERY_BANNER,
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

  it('detects recovery banner copy', () => {
    expect(isStreamRecoveryBanner(STREAM_RECOVERY_BANNER)).toBe(true)
    expect(isStreamRecoveryBanner('连接中断，任务在后台继续')).toBe(false)
  })

  it('clears only recovery banner from state', () => {
    const state = {
      ...createInitialAgentStreamUiState(),
      hostGuardMessage: STREAM_RECOVERY_BANNER,
    }
    expect(clearStreamRecoveryBanner(state).hostGuardMessage).toBeUndefined()
    const host = {
      ...state,
      hostGuardMessage: '连接中断，任务在后台继续',
    }
    expect(clearStreamRecoveryBanner(host).hostGuardMessage).toBe(
      '连接中断，任务在后台继续',
    )
  })
})
