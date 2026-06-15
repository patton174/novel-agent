/** 防抖滚动到底部（聊天 / 章节流式面板共用） */
export function createDebouncedScrollToBottom(
  getElement: () => HTMLElement | null,
  debounceMs = 80,
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let raf: number | null = null

  const run = () => {
    const el = getElement()
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  const scrollToBottom = (force = false) => {
    if (force) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (raf != null) {
        cancelAnimationFrame(raf)
      }
      raf = requestAnimationFrame(run)
      return
    }
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      if (raf != null) {
        cancelAnimationFrame(raf)
      }
      raf = requestAnimationFrame(run)
    }, debounceMs)
  }

  const dispose = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (raf != null) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

  return { scrollToBottom, dispose }
}
