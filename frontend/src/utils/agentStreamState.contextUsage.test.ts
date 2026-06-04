import { describe, expect, it } from 'vitest'
import {
  applyAgentEvent,
  createInitialAgentStreamUiState,
} from './agentStreamState'

describe('context.usage events', () => {
  it('updates contextUsage from wire payload', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'context.usage',
        sequence: 1,
        payload: {
          turn: 1,
          prompt_tokens: 42000,
          context_limit: 200000,
          context_percent: 21,
          run_input_tokens: 12000,
          run_output_tokens: 800,
          cache_read_tokens: 5000,
          cache_creation_tokens: 0,
          compressed: false,
          sections: { transcript: 3000, think: 1200 },
        },
      }),
    )
    expect(state.contextUsage?.promptTokens).toBe(42000)
    expect(state.contextUsage?.contextPercent).toBe(21)
    expect(state.contextUsage?.runInputTokens).toBe(12000)
  })

  it('marks compact note on context.compacted', () => {
    let state = createInitialAgentStreamUiState()
    state = applyAgentEvent(
      state,
      'agent-event',
      JSON.stringify({
        type: 'context.compacted',
        sequence: 2,
        payload: { message: '已压缩 transcript', prompt_tokens: 30000 },
      }),
    )
    expect(state.contextUsage?.compressed).toBe(true)
    expect(state.contextUsage?.compactNote).toContain('压缩')
  })
})
