import { describe, expect, it } from 'vitest'
import { createInitialAgentStreamUiState } from './agentStreamState'
import { deriveAssistantStreamPhase } from './agentStreamPhase'

describe('deriveAssistantStreamPhase', () => {
  it('prefers error when streamError is set', () => {
    let s = createInitialAgentStreamUiState()
    s = { ...s, streamError: 'boom' }
    expect(deriveAssistantStreamPhase(s)).toBe('error')
  })

  it('returns completed when run is terminal or stream ended', () => {
    let s = createInitialAgentStreamUiState()
    s = { ...s, runTerminalAck: true }
    expect(deriveAssistantStreamPhase(s)).toBe('completed')
    s = { ...s, runTerminalAck: false, isStreamEnded: true }
    expect(deriveAssistantStreamPhase(s)).toBe('completed')
  })

  it('returns tool_running when a tool step is started', () => {
    let s = createInitialAgentStreamUiState()
    s = {
      ...s,
      stepStates: [
        {
          stepId: 't1',
          type: 'tool',
          status: 'started',
          title: '撰写',
          toolName: 'output',
        },
      ],
    }
    expect(deriveAssistantStreamPhase(s)).toBe('tool_running')
  })

  it('returns streaming when there is public text and run not finished', () => {
    let s = createInitialAgentStreamUiState()
    s = { ...s, messageContent: '第一段' }
    expect(deriveAssistantStreamPhase(s)).toBe('streaming')
  })

  it('returns planning when thinking and no text/tools', () => {
    let s = createInitialAgentStreamUiState()
    s = { ...s, isThinking: true }
    expect(deriveAssistantStreamPhase(s)).toBe('planning')
  })

  it('returns waiting when awaiting user interaction', () => {
    let s = createInitialAgentStreamUiState()
    s = { ...s, awaitingInteraction: true }
    expect(deriveAssistantStreamPhase(s)).toBe('waiting')
  })

  it('returns connecting before any think or tool activity', () => {
    expect(deriveAssistantStreamPhase(createInitialAgentStreamUiState())).toBe('connecting')
  })
})
