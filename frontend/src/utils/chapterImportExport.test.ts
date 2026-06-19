import { describe, expect, it } from 'vitest'
import { parseImportedChapter } from './chapterImportExport'

describe('chapterImportExport', () => {
  it('parses markdown with title heading', () => {
    const parsed = parseImportedChapter('# Chapter One\n\nHello world', 'ch.md')
    expect(parsed.title).toBe('Chapter One')
    expect(parsed.content).toBe('Hello world')
  })

  it('parses json payload', () => {
    const parsed = parseImportedChapter(JSON.stringify({ title: 'T', content: 'Body' }), 'ch.json')
    expect(parsed.title).toBe('T')
    expect(parsed.content).toBe('Body')
  })

  it('parses plain text', () => {
    const parsed = parseImportedChapter('Plain body', 'note.txt')
    expect(parsed.content).toBe('Plain body')
  })
})
