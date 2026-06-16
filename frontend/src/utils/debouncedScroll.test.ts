import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createDebouncedScrollToBottom } from './debouncedScroll'

describe('createDebouncedScrollToBottom', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces scroll calls', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true })
    let scrollTop = 0
    Object.defineProperty(el, 'scrollTop', {
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v
      },
      configurable: true,
    })
    const scroller = createDebouncedScrollToBottom(() => el, 80)
    scroller.scrollToBottom()
    expect(scrollTop).toBe(0)
    vi.advanceTimersByTime(80)
    expect(scrollTop).toBe(400)
    scroller.dispose()
  })

  it('force scroll skips debounce', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { value: 200, configurable: true })
    let scrollTop = 0
    Object.defineProperty(el, 'scrollTop', {
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v
      },
      configurable: true,
    })
    const scroller = createDebouncedScrollToBottom(() => el, 80)
    scroller.scrollToBottom(true)
    vi.runAllTimers()
    expect(scrollTop).toBe(200)
    scroller.dispose()
  })
})

describe('isChapterStreamTool', () => {
  it('recognizes WriteChapter and legacy Write', async () => {
    const { isChapterStreamTool } = await import('./agentToolNames')
    expect(isChapterStreamTool('WriteChapter')).toBe(true)
    expect(isChapterStreamTool('EditChapter')).toBe(true)
    expect(isChapterStreamTool('Write')).toBe(true)
    expect(isChapterStreamTool('WriteMemory')).toBe(false)
  })
})
