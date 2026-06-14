import type { AgentContextUsage } from '../types/agent'
import type { ComposerSpinnerMode } from './deriveComposerSpinnerMode'

export type ComposerTokenMode = 'in' | 'out'

export interface ComposerTokenDisplayState {
  mode: ComposerTokenMode
  value: number
  direction: 'down' | 'up'
}

/** Run-level API input tokens; fall back to prompt window size when not yet reported. */
export function composerInputTokenValue(usage: AgentContextUsage): number {
  return usage.runInputTokens > 0 ? usage.runInputTokens : usage.promptTokens
}

/**
 * CC SpinnerModeGlyph maps stream activity → arrow direction.
 * Composer footer pairs: ↓ run input / prompt, ↑ run output (user-facing Codex style).
 *
 * CC reference (SpinnerAnimationRow SpinnerModeGlyph):
 * - requesting → ↑
 * - thinking / responding / tool-input / tool-use → ↓
 *
 * We switch *which metric* on the same event timing:
 * - responding (model text streaming) → ↑ runOutputTokens
 * - requesting / thinking / tool-use → ↓ input tokens
 */
export function deriveComposerTokenDisplay(params: {
  usage: AgentContextUsage
  streamActive: boolean
  spinnerMode: ComposerSpinnerMode
}): ComposerTokenDisplayState {
  const { usage, streamActive, spinnerMode } = params
  const inValue = composerInputTokenValue(usage)
  const outValue = usage.runOutputTokens

  if (!streamActive || spinnerMode === 'idle') {
    return { mode: 'in', value: inValue, direction: 'down' }
  }

  if (spinnerMode === 'responding') {
    return { mode: 'out', value: outValue, direction: 'up' }
  }

  return { mode: 'in', value: inValue, direction: 'down' }
}
