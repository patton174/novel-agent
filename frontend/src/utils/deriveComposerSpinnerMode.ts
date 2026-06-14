import type { AgentAssistantStreamPhase } from '../types/agent'

/**
 * Mirrors Claude Code `SpinnerMode` timing (see claude-code-ref messages.ts + SpinnerModeGlyph).
 * Used to pick which token metric the composer footer shows — not a fixed timer.
 */
export type ComposerSpinnerMode =
  | 'idle'
  | 'requesting'
  | 'thinking'
  | 'responding'
  | 'tool-use'

export function deriveComposerSpinnerMode(params: {
  streamActive: boolean
  streamPhase?: AgentAssistantStreamPhase
  isThinking?: boolean
  hasStreamingText?: boolean
}): ComposerSpinnerMode {
  const { streamActive, streamPhase, isThinking, hasStreamingText } = params
  if (!streamActive) {
    return 'idle'
  }

  // CC content_block_start text / message_delta → responding
  if (streamPhase === 'streaming' || hasStreamingText) {
    return 'responding'
  }

  // CC message_stop / tool execution → tool-use
  if (streamPhase === 'tool_running') {
    return 'tool-use'
  }

  // CC thinking / redacted_thinking blocks → thinking
  if (streamPhase === 'planning' || isThinking) {
    return 'thinking'
  }

  // CC stream_request_start / pre-first-token → requesting
  return 'requesting'
}
