/** 主 SSE（handleSend）是否仍在消费中 */
export function isPrimaryAgentStreamActive(
  abortController: AbortController | null | undefined,
): boolean {
  return Boolean(abortController && !abortController.signal.aborted)
}

/**
 * 主 SSE 仍活跃时禁止再开 recovery SSE（避免双连接 + 误触发 host detach）。
 * 此时仅依赖 status WS / 事件轮询追进度。
 */
export function shouldOpenRecoverySse(
  primaryAbort: AbortController | null | undefined,
): boolean {
  return !isPrimaryAgentStreamActive(primaryAbort)
}
