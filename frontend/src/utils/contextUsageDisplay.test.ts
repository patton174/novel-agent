import { describe, expect, it } from 'vitest'
import {
  contextRemainingPercent,
  contextUsedPercent,
  formatCcTokens,
} from './contextUsageDisplay'
import type { AgentContextUsage } from '../types/agent'

const sample: AgentContextUsage = {
  turn: 2,
  promptTokens: 88_000,
  contextLimit: 200_000,
  contextPercent: 44,
  percentLeft: 56,
  runInputTokens: 120_000,
  runOutputTokens: 8_000,
  cacheReadTokens: 40_000,
  cacheCreationTokens: 0,
  compressed: false,
  source: 'api',
}

describe('contextUsageDisplay', () => {
  it('formatCcTokens matches CC-style compact suffix', () => {
    expect(formatCcTokens(900)).toBe('900')
    expect(formatCcTokens(12000)).toBe('12k')
    expect(formatCcTokens(1_200_000)).toBe('1.2m')
  })

  it('contextUsedPercent prefers contextPercent', () => {
    expect(contextUsedPercent(sample)).toBe(44)
    expect(contextRemainingPercent(sample)).toBe(56)
  })
})
