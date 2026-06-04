import { describe, expect, it } from 'vitest'
import {
  isAskUserTool,
  isChapterContentSideEffect,
  isChapterWriteTool,
  isCollapsibleReadTool,
  normalizeToolName,
  shouldRefreshStoryMemoryAfterTool,
} from './agentToolNames'

describe('agentToolNames', () => {
  it('normalizes legacy chapter/memory tools to CC names', () => {
    expect(normalizeToolName('chapter_create')).toBe('Write')
    expect(normalizeToolName('memory_read')).toBe('Read')
    expect(normalizeToolName('choose')).toBe('AskUser')
  })

  it('detects AskUser variants', () => {
    expect(isAskUserTool('AskUser')).toBe(true)
    expect(isAskUserTool('choose')).toBe(true)
    expect(isAskUserTool('Read')).toBe(false)
  })

  it('detects chapter write tools', () => {
    expect(isChapterWriteTool('Write')).toBe(true)
    expect(isChapterWriteTool('chapter_update')).toBe(true)
    expect(isChapterWriteTool('Read')).toBe(false)
  })

  it('detects collapsible read tools', () => {
    expect(isCollapsibleReadTool('Read')).toBe(true)
    expect(isCollapsibleReadTool('memory_read')).toBe(true)
    expect(isCollapsibleReadTool('Write')).toBe(false)
  })

  it('distinguishes chapter vs memory Write side effects', () => {
    expect(
      isChapterContentSideEffect('Write', {
        file_path: '/novel/1/chapters/c1.md',
      }),
    ).toBe(true)
    expect(
      isChapterContentSideEffect('Write', {
        file_path: '/novel/1/memory/novel/大纲.json',
      }),
    ).toBe(false)
    expect(isChapterContentSideEffect('chapter_update')).toBe(true)
  })

  it('refreshes memory on vfs memory path mutations', () => {
    expect(
      shouldRefreshStoryMemoryAfterTool('Write', {
        file_path: '/novel/1/memory/characters/alice.md',
      }),
    ).toBe(true)
    expect(
      shouldRefreshStoryMemoryAfterTool('Write', {
        file_path: '/novel/1/chapters/c1.md',
      }),
    ).toBe(false)
    expect(shouldRefreshStoryMemoryAfterTool('memory_update')).toBe(true)
  })
})
