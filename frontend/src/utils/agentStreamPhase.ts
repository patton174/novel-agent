import type { AgentAssistantStreamPhase, AgentStreamUiState } from '../types/agent'

export function deriveAssistantStreamPhase(state: AgentStreamUiState): AgentAssistantStreamPhase {
  if (state.streamError) {
    return 'error'
  }
  if (state.awaitingInteraction) {
    return 'waiting'
  }
  const hasText = Boolean(state.messageContent.trim())
  if (state.runTerminalAck || state.isStreamEnded) {
    return 'completed'
  }

  const runningTool = state.stepStates.some((s) => s.type === 'tool' && s.status === 'started')
  if (runningTool) {
    return 'tool_running'
  }
  if (hasText) {
    return 'streaming'
  }
  if (state.isThinking) {
    return 'planning'
  }
  // 流已开始、首条编排事件尚未到达：归入 planning，避免「准备中」独立占位框
  return 'planning'
}
