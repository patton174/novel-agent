import { useLayoutEffect, useState, type RefObject } from 'react'

const EXTRA_GAP_PX = 20
const FALLBACK_INSET_PX = 152

/** 悬浮输入框实际高度 → 消息列表底部留白（避免被遮挡） */
export function useComposerSafeInset(
  composerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): number {
  const [inset, setInset] = useState(FALLBACK_INSET_PX)

  useLayoutEffect(() => {
    if (!enabled) {
      return
    }
    const el = composerRef.current
    if (!el) {
      return
    }

    const update = () => {
      const height = Math.ceil(el.getBoundingClientRect().height)
      setInset(Math.max(FALLBACK_INSET_PX, height + EXTRA_GAP_PX))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [composerRef, enabled])

  return inset
}
