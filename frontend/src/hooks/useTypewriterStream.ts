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

/** 单帧推进量：积压大时略提速，但上限很低以保持逐字感 */
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
  const baseCps = 18
  const cps = Math.min(48, baseCps + backlog * 0.08)
  const byTime = Math.max(1, Math.round((cps * dtMs) / 1000))
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
 */
export function useTypewriterBuffer(
  target: string,
  { resetKey, playing, finished, maxCharsPerFrame = 2 }: UseTypewriterBufferOptions,
): { visible: string; isTyping: boolean } {
  const cursorRef = useRef(0)
  const targetRef = useRef(target)
  const [visibleCount, setVisibleCount] = useState(0)

  targetRef.current = target

  useEffect(() => {
    cursorRef.current = 0
    setVisibleCount(0)
  }, [resetKey])

  useEffect(() => {
    const targetLenNow = () => Array.from(targetRef.current).length

    if (finished) {
      const len = targetLenNow()
      cursorRef.current = len
      setVisibleCount(len)
      return undefined
    }

    if (!playing) {
      return undefined
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64)
      last = now
      const len = targetLenNow()
      const next = computeTypewriterStep(
        cursorRef.current,
        len,
        dt,
        maxCharsPerFrame,
      )
      if (next !== cursorRef.current) {
        cursorRef.current = next
        setVisibleCount(next)
      }
      if (cursorRef.current >= len) {
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, finished, resetKey, maxCharsPerFrame])

  const targetLen = Array.from(target).length
  const visible = sliceTextByRunes(target, visibleCount)
  return {
    visible,
    isTyping: visibleCount < targetLen,
  }
}

/** @deprecated 兼容旧组件；新代码请用 useTypewriterBuffer */
export function useTypewriterStream(
  target: string,
  {
    active,
    resetKey,
    maxCharsPerFrame = 2,
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
