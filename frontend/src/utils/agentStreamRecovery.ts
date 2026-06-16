import type { AgentStreamUiState } from '../types/agent'

/** SSE 断开后是否应走 status WS 追事件 */
export function shouldAttachStreamRecovery(state: AgentStreamUiState): boolean {
  return Boolean(state.runId) && !state.runTerminalAck && !state.isStreamEnded
}

export const STREAM_RECOVERY_BANNER =
  '连接中断，正在重连 SSE…'

export function isPeerDroppedStreamError(message: string): boolean {
  return /incomplete chunked read|peer closed connection|ERR_HTTP2_PROTOCOL_ERROR|HTTP2_PROTOCOL_ERROR|net::ERR_|network error|NetworkError when attempting to fetch|Load failed/i.test(
    message,
  )
}
