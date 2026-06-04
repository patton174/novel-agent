import type { EditorMessage } from '../types/editor'

/** Debounce localStorage writes during SSE — full serialize each tick OOMs the tab. */
export function createStreamPersistDebouncer(
  persist: (sessionId: string, list: EditorMessage[]) => void,
  delayMs = 2000,
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: { sessionId: string; list: EditorMessage[] } | null = null

  return {
    schedule(sessionId: string, list: EditorMessage[]) {
      pending = { sessionId, list }
      if (timer !== null) return
      timer = setTimeout(() => {
        timer = null
        if (pending) {
          persist(pending.sessionId, pending.list)
          pending = null
        }
      }, delayMs)
    },
    flushNow() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      if (pending) {
        persist(pending.sessionId, pending.list)
        pending = null
      }
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      pending = null
    },
  }
}
