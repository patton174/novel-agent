import { describe, expect, it } from 'vitest'
import {
  isAskUserTool,
  isChapterContentSideEffect,
  isChapterWriteTool,
  isCollapsibleReadTool,
  normalizeToolName,
  shouldRefreshMemoryAfterTool,
} from './agentToolNames'

describe('agentToolNames', () => {
  it('maps API tools to CC icon buckets', () => {
    expect(normalizeToolName('ReadMemory')).toBe('Read')
    expect(normalizeToolName('WriteChapter')).toBe('Write')
    expect(normalizeToolName('choose')).toBe('AskUser')
    expect(normalizeToolName('SearchKnowledge')).toBe('Grep')
    expect(normalizeToolName('memory_read')).toBe('Read')
    expect(normalizeToolName('chapter_list')).toBe('Glob')
  })

  it('detects AskUser variants', () => {
    expect(isAskUserTool('AskUser')).toBe(true)
    expect(isAskUserTool('choose')).toBe(true)
    expect(isAskUserTool('ReadMemory')).toBe(false)
  })

  it('detects chapter write tools', () => {
    expect(isChapterWriteTool('WriteChapter')).toBe(true)
    expect(isChapterWriteTool('EditChapter')).toBe(true)
    expect(isChapterWriteTool('ReadChapter')).toBe(false)
    expect(isChapterWriteTool('CreateMemory')).toBe(false)
  })

  it('detects collapsible read tools', () => {
    expect(isCollapsibleReadTool('ReadMemory')).toBe(true)
    expect(isCollapsibleReadTool('ReadChapter')).toBe(true)
    expect(isCollapsibleReadTool('Read')).toBe(true)
    expect(isCollapsibleReadTool('memory_read')).toBe(true)
    expect(isCollapsibleReadTool('WriteChapter')).toBe(false)
  })

  it('detects chapter content side effects', () => {
    expect(isChapterContentSideEffect('WriteChapter')).toBe(true)
    expect(isChapterContentSideEffect('EditChapter')).toBe(true)
    expect(isChapterContentSideEffect('ReorderChapters')).toBe(true)
    expect(isChapterContentSideEffect('CreateMemory')).toBe(false)
    expect(isChapterContentSideEffect('ChapterAudit')).toBe(false)
  })

  it('refreshes memory panel after memory mutation tools', () => {
    expect(shouldRefreshMemoryAfterTool('CreateMemory')).toBe(true)
    expect(shouldRefreshMemoryAfterTool('UpdateMemoryFields')).toBe(true)
    expect(shouldRefreshMemoryAfterTool('UpdateMemoryContent')).toBe(true)
    expect(shouldRefreshMemoryAfterTool('UpdateMemoryMeta')).toBe(true)
    expect(shouldRefreshMemoryAfterTool('MoveMemory')).toBe(true)
    expect(shouldRefreshMemoryAfterTool('DeleteMemory')).toBe(true)
    expect(shouldRefreshMemoryAfterTool('WriteChapter')).toBe(false)
    expect(shouldRefreshMemoryAfterTool('ReadMemory')).toBe(false)
  })
})
