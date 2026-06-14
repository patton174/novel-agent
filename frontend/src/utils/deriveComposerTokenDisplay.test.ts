import { describe, expect, it } from 'vitest'
import type { AgentContextUsage } from '../types/agent'
import { deriveComposerTokenDisplay } from './deriveComposerTokenDisplay'

const baseUsage = (): AgentContextUsage => ({
  turn: 1,
  promptTokens: 12_000,
  contextLimit: 200_000,
  contextPercent: 6,
  runInputTokens: 12_000,
  runOutputTokens: 800,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  compressed: false,
})

describe('deriveComposerTokenDisplay', () => {
  it('shows input tokens when idle', () => {
    const usage = baseUsage()
    expect(
      deriveComposerTokenDisplay({ usage, streamActive: false, spinnerMode: 'idle' }),
    ).toEqual({
      mode: 'in',
      value: 12_000,
      direction: 'down',
    })
  })

  it('shows output tokens during responding (CC text stream)', () => {
    const usage = { ...baseUsage(), runOutputTokens: 25_000 }
    expect(
      deriveComposerTokenDisplay({
        usage,
        streamActive: true,
        spinnerMode: 'responding',
      }),
    ).toEqual({
      mode: 'out',
      value: 25_000,
      direction: 'up',
    })
  })

  it('shows input tokens during requesting (CC pre-first-token)', () => {
    const usage = baseUsage()
    expect(
      deriveComposerTokenDisplay({
        usage,
        streamActive: true,
        spinnerMode: 'requesting',
      }),
    ).toEqual({
      mode: 'in',
      value: 12_000,
      direction: 'down',
    })
  })

  it('shows input tokens during tool-use', () => {
    const usage = baseUsage()
    expect(
      deriveComposerTokenDisplay({
        usage,
        streamActive: true,
        spinnerMode: 'tool-use',
      }),
    ).toEqual({
      mode: 'in',
      value: 12_000,
      direction: 'down',
    })
  })
})
