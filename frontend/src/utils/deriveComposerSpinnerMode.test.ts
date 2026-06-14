import { describe, expect, it } from 'vitest'
import { deriveComposerSpinnerMode } from './deriveComposerSpinnerMode'

describe('deriveComposerSpinnerMode', () => {
  it('returns idle when not streaming', () => {
    expect(deriveComposerSpinnerMode({ streamActive: false })).toBe('idle')
  })

  it('returns responding when streaming text', () => {
    expect(
      deriveComposerSpinnerMode({
        streamActive: true,
        streamPhase: 'streaming',
      }),
    ).toBe('responding')
  })

  it('returns tool-use during tool_running', () => {
    expect(
      deriveComposerSpinnerMode({
        streamActive: true,
        streamPhase: 'tool_running',
      }),
    ).toBe('tool-use')
  })

  it('returns thinking during planning', () => {
    expect(
      deriveComposerSpinnerMode({
        streamActive: true,
        streamPhase: 'planning',
        isThinking: true,
      }),
    ).toBe('thinking')
  })

  it('returns requesting when connecting', () => {
    expect(
      deriveComposerSpinnerMode({
        streamActive: true,
        streamPhase: 'connecting',
      }),
    ).toBe('requesting')
  })
})
