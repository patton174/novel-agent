import i18n from '@/i18n'
import type { AgentStreamUiState } from '../types/agent'

/** SSE 断开后是否应走 status WS 追事件 */
export function shouldAttachStreamRecovery(state: AgentStreamUiState): boolean {
  return Boolean(state.runId) && !state.runTerminalAck && !state.isStreamEnded
}

export function getStreamRecoveryBanner(): string {
  return i18n.t('editor:agent.stream.recoveryBanner')
}

export function getHostDetachBanner(): string {
  return i18n.t('editor:agent.stream.hostDetach')
}

/** @deprecated Prefer getStreamRecoveryBanner() — kept for tests importing the symbol */
export const STREAM_RECOVERY_BANNER = getStreamRecoveryBanner()

function localizedRecoveryBanners(): string[] {
  return ['zh', 'en'].map((lng) => i18n.t('editor:agent.stream.recoveryBanner', { lng }))
}

function localizedHostDetachBanners(): string[] {
  return ['zh', 'en'].map((lng) => i18n.t('editor:agent.stream.hostDetach', { lng }))
}

export function isStreamRecoveryBanner(message?: string): boolean {
  const text = (message ?? '').trim()
  if (!text) {
    return false
  }
  return (
    localizedRecoveryBanners().some((banner) => text === banner) ||
    /reconnecting SSE|正在重连 SSE|断线重连/i.test(text)
  )
}

export function isHostDetachMessage(message?: string): boolean {
  const text = (message ?? '').trim()
  if (!text) {
    return false
  }
  return (
    isStreamRecoveryBanner(text) ||
    localizedHostDetachBanners().some((banner) => text === banner) ||
    text.includes('任务在 Worker 继续') ||
    text.includes('任务在后台继续') ||
    text.toLowerCase().includes('host channel') ||
    text.includes('状态通道')
  )
}

export function clearStreamRecoveryBanner(
  state: AgentStreamUiState,
): AgentStreamUiState {
  if (!isStreamRecoveryBanner(state.hostGuardMessage)) {
    return state
  }
  return { ...state, hostGuardMessage: undefined, streamError: undefined }
}

/** Message persisted on assistant bubble — strips transient SSE recovery copy. */
export function resolveAgentHostGuardMessage(
  state: AgentStreamUiState,
): string | undefined {
  const msg = state.hostGuardMessage
  if (!msg || isStreamRecoveryBanner(msg)) {
    return undefined
  }
  return msg
}

export function isPeerDroppedStreamError(message: string): boolean {
  return /incomplete chunked read|peer closed connection|ERR_HTTP2_PROTOCOL_ERROR|HTTP2_PROTOCOL_ERROR|net::ERR_|network error|NetworkError when attempting to fetch|Load failed/i.test(
    message,
  )
}
