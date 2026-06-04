import { describe, expect, it } from 'vitest'
import {
  buildSceneMessages,
  buildSceneMessagesAtStep,
  sceneEventCountForProgress,
  scenePlayableEventCount,
} from './buildMarketingSceneDemo'

describe('buildMarketingSceneDemo', () => {
  it('buildSceneMessagesAtStep reveals tools one step at a time', () => {
    const total = scenePlayableEventCount('orchestrate')
    const early = buildSceneMessagesAtStep('orchestrate', 2)
    const late = buildSceneMessagesAtStep('orchestrate', total, true)
    const earlyTools = (early.find((m) => m.role === 'assistant')?.agentSteps ?? []).map(
      (s) => s.toolName,
    )
    const lateTools = (late.find((m) => m.role === 'assistant')?.agentSteps ?? []).map(
      (s) => s.toolName,
    )
    expect(earlyTools.length).toBeLessThan(lateTools.length)
    expect(lateTools).toContain('memory_read')
    expect(lateTools).toContain('chapter_read')
  })

  it('orchestrate scene replays memory_read and chapter_read', () => {
    const msgs = buildSceneMessages('orchestrate', 1)
    const assistant = msgs.find((m) => m.role === 'assistant')
    const tools = (assistant?.agentSteps ?? []).map((s) => s.toolName)
    expect(tools).toContain('memory_read')
    expect(tools).toContain('chapter_read')
  })

  it('progress advances one event band at a time', () => {
    const total = scenePlayableEventCount('orchestrate')
    expect(sceneEventCountForProgress(0.05, total)).toBe(0)
    expect(sceneEventCountForProgress(0.12, total)).toBe(1)
    const mid = sceneEventCountForProgress(0.45, total)
    const later = sceneEventCountForProgress(0.55, total)
    expect(later).toBeGreaterThanOrEqual(mid)
    expect(later - mid).toBeLessThanOrEqual(1)
  })

  it('subagent scene attaches nested panel to Agent parent step', () => {
    const msgs = buildSceneMessages('subagent', 1)
    const assistant = msgs.find((m) => m.role === 'assistant')
    const agentStep = (assistant?.agentSteps ?? []).find(
      (s) => s.toolName === 'Agent' || s.toolName === 'agent',
    )
    expect(agentStep?.subagent?.status).toBe('done')
    expect(agentStep?.subagent?.logs.length).toBeGreaterThan(0)
  })
})
