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
  return 'connecting'
}
