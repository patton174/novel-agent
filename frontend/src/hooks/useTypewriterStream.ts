import { useEffect, useRef, useState } from 'react'

export interface UseTypewriterBufferOptions {
  /** 同一条助手消息 id，仅此时重置游标 */
  resetKey: string
  /** 流式会话进行中（含工具执行阶段，不因 phase 暂停而重置） */
  playing: boolean
  /** 流已结束：快速追平到全文 */
  finished: boolean
  /** 每帧最多揭示字符数（越小越像打字机） */
  maxCharsPerFrame?: number
}

/** 自适应步进：积压越大越快，但单帧仍受 maxCharsPerFrame 限制 */
export function computeTypewriterStep(
  cursor: number,
  targetLen: number,
  dtMs: number,
  maxCharsPerFrame: number,
): number {
  if (cursor >= targetLen || targetLen <= 0) {
    return cursor
  }
  const backlog = targetLen - cursor
  const frameMs = Math.max(dtMs, 8)
  const catchUpCps = Math.min(280, Math.max(52, backlog * 16))
  const byTime = Math.max(1, Math.round((catchUpCps * frameMs) / 1000))
  const step = Math.min(maxCharsPerFrame, byTime)
  return Math.min(targetLen, cursor + step)
}

export function sliceTextByRunes(text: string, count: number): string {
  if (count <= 0) {
    return ''
  }
  return Array.from(text).slice(0, count).join('')
}

/**
 * 可扩容缓冲区：SSE 只追加 target，游标单向播放，不在工具阶段重置。
 * 播放期间 rAF 持续运行，新 delta 到达时无需重启动画环。
 *
 * 性能：runes 按 append-only 增量维护（仅扫描新增片段），visible 字符串按
 * 游标增量拼接，每帧 O(step) 而非 O(全文)，避免长章节下的卡顿。
 */
export function useTypewriterBuffer(
  target: string,
  { resetKey, playing, finished, maxCharsPerFrame = 8 }: UseTypewriterBufferOptions,
): { visible: string; isTyping: boolean } {
  const cursorRef = useRef(0)
  const runesRef = useRef<string[]>([])
  const targetLenRef = useRef(0)
  const prevTargetRef = useRef('')
  const rebuildRef = useRef(false)
  const playingRef = useRef(playing)
  const finishedRef = useRef(finished)
  const [visible, setVisible] = useState('')

  playingRef.current = playing
  finishedRef.current = finished

  // 增量同步 runes 与 target；append-only 时仅扫描新增后缀。
  if (target !== prevTargetRef.current) {
    if (prevTargetRef.current && target.startsWith(prevTargetRef.current)) {
      const suffix = target.slice(prevTargetRef.current.length)
      const extra = Array.from(suffix)
      for (const r of extra) {
        runesRef.current.push(r)
      }
    } else {
      // 非追加变化（重置/替换）：重建 runes，标记需要重新派生 visible
      runesRef.current = Array.from(target)
      if (cursorRef.current > runesRef.current.length) {
        cursorRef.current = runesRef.current.length
      }
      rebuildRef.current = true
    }
    targetLenRef.current = runesRef.current.length
    prevTargetRef.current = target
  }

  useEffect(() => {
    cursorRef.current = 0
    setVisible('')
  }, [resetKey])

  // 重建后按当前游标重新派生 visible，避免累积字符串与新 target 不一致
  useEffect(() => {
    if (!rebuildRef.current) {
      return
    }
    rebuildRef.current = false
    const c = Math.min(cursorRef.current, targetLenRef.current)
    cursorRef.current = c
    setVisible(runesRef.current.slice(0, c).join(''))
  })

  useEffect(() => {
    if (finished) {
      cursorRef.current = targetLenRef.current
      setVisible(runesRef.current.join(''))
      return undefined
    }

    if (!playing) {
      return undefined
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      if (finishedRef.current) {
        cursorRef.current = targetLenRef.current
        setVisible(runesRef.current.join(''))
        return
      }
      if (!playingRef.current) {
        return
      }

      const dt = Math.min(now - last, 48)
      last = now
      const len = targetLenRef.current
      const prevCursor = cursorRef.current
      const next = computeTypewriterStep(prevCursor, len, dt, maxCharsPerFrame)
      if (next !== prevCursor) {
        cursorRef.current = next
        const added = runesRef.current.slice(prevCursor, next).join('')
        if (added) {
          setVisible((prev) => prev + added)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, finished, resetKey, maxCharsPerFrame])

  return {
    visible,
    isTyping: cursorRef.current < targetLenRef.current,
  }
}

/** @deprecated 兼容旧组件；新代码请用 useTypewriterBuffer */
export function useTypewriterStream(
  target: string,
  {
    active,
    resetKey,
    maxCharsPerFrame = 8,
  }: {
    active: boolean
    resetKey: string
    maxCharsPerFrame?: number
  },
): { visible: string; isTyping: boolean } {
  return useTypewriterBuffer(target, {
    resetKey,
    playing: active,
    finished: !active,
    maxCharsPerFrame,
  })
}
