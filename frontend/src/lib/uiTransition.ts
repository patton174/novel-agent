const TRANSITION_MS = 280

/** 主题 / 语言切换时短暂启用 CSS 过渡，避免突兀跳变 */
export function runUiTransition(mutate: () => void) {
  if (typeof document === 'undefined') {
    mutate()
    return
  }
  const root = document.documentElement
  root.classList.add('theme-transition')
  mutate()
  window.setTimeout(() => root.classList.remove('theme-transition'), TRANSITION_MS)
}
