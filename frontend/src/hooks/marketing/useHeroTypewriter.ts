import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { sliceTextByRunes } from '@/hooks/useTypewriterStream'

export interface UseHeroTypewriterOptions {
  /** 每秒字符数 */
  cps?: number
  /** 延迟开始（ms） */
  delayMs?: number
  enabled?: boolean
}

/** Hero 首次加载打字机：按字符揭示，支持 emoji / 中文 rune */
export function useHeroTypewriter(
  text: string,
  { cps = 28, delayMs = 0, enabled = true }: UseHeroTypewriterOptions = {},
) {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(reduced || !enabled ? Array.from(text).length : 0)

  useEffect(() => {
    if (reduced || !enabled) {
      setCount(Array.from(text).length)
      return
    }

    setCount(0)
    const runes = Array.from(text)
    if (runes.length === 0) return

    let interval = 0
    let i = 0
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        i += 1
        setCount(i)
        if (i >= runes.length) window.clearInterval(interval)
      }, 1000 / cps)
    }, delayMs)

    return () => {
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [text, cps, delayMs, enabled, reduced])

  return {
    visibleText: sliceTextByRunes(text, count),
    done: count >= Array.from(text).length,
  }
}
