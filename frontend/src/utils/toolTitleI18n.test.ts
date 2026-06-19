import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import {
  inferToolTitlePhase,
  resolveToolTitle,
  type ToolTitlePhase,
} from './toolTitleI18n'

// Inject a controlled bundle so the resolver logic (phase fallbacks, legacy
// fallback) is tested independently of the app's in-flight i18n restructure.
beforeAll(async () => {
  i18n.addResourceBundle(
    'zh',
    'editor',
    {
      timeline: {
        toolTitles: {
          WriteChapter: {
            running: '正在写入章节…',
            runningStream: '正在续写章节…',
            done: '已写入章节',
            failed: '写入章节失败',
          },
          ReadChapter: {
            running: '正在阅读章节…',
            done: '已阅读章节',
            failed: '读取章节失败',
          },
          AskUser: {
            running: '等待你的回复…',
            awaiting: '等待你的回复…',
            done: '已收到回复',
            failed: '提问失败',
          },
        },
      },
    },
    true,
    true,
  )
  await i18n.changeLanguage('zh')
})

describe('inferToolTitlePhase', () => {
  it('maps Chinese phase labels onto the phase enum', () => {
    expect(inferToolTitlePhase('失败')).toBe('failed')
    expect(inferToolTitlePhase('已完成')).toBe('done')
    expect(inferToolTitlePhase('等待回答')).toBe('awaiting')
    expect(inferToolTitlePhase('运行中')).toBe('running')
    expect(inferToolTitlePhase('进行中')).toBe('running')
    expect(inferToolTitlePhase(undefined)).toBe('started')
  })

  it('treats active rows as running, and streaming as runningStream', () => {
    expect(inferToolTitlePhase(undefined, { active: true })).toBe('running')
    expect(inferToolTitlePhase('运行中', { active: true, streaming: true })).toBe(
      'runningStream',
    )
  })
})

describe('resolveToolTitle', () => {
  it('returns a phase-specific title for known tools', () => {
    const done = resolveToolTitle('WriteChapter', 'done')
    expect(done.hasPhaseTitle).toBe(true)
    expect(done.title).toBe('已写入章节')

    expect(resolveToolTitle('WriteChapter', 'failed').title).toBe('写入章节失败')
  })

  it('uses the dedicated streaming title when present', () => {
    expect(resolveToolTitle('WriteChapter', 'runningStream').title).toBe('正在续写章节…')
  })

  it('falls back runningStream → running when no streaming title exists', () => {
    const read = resolveToolTitle('ReadChapter', 'runningStream')
    expect(read.hasPhaseTitle).toBe(true)
    expect(read.title).toBe('正在阅读章节…')
  })

  it('falls back awaiting → running for non-AskUser tools', () => {
    expect(resolveToolTitle('WriteChapter', 'awaiting').title).toBe('正在写入章节…')
  })

  it('keeps a dedicated awaiting title for AskUser', () => {
    expect(resolveToolTitle('AskUser', 'awaiting').title).toBe('等待你的回复…')
  })

  it('returns no phase title (legacy fallback) for unknown tools', () => {
    const out = resolveToolTitle('MysteryToolXYZ', 'running' as ToolTitlePhase)
    expect(out.hasPhaseTitle).toBe(false)
    expect(out.title).toBe('MysteryToolXYZ')
  })

  it('returns no phase title when started has no dedicated key', () => {
    expect(resolveToolTitle('WriteChapter', 'started').hasPhaseTitle).toBe(false)
  })
})
