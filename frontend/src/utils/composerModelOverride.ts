const STORAGE_PREFIX = 'novel-agent-composer-model:'

export function readComposerModelOverride(sessionId: string | null | undefined): string | null {
  if (!sessionId) return null
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`)
  } catch {
    return null
  }
}

export function writeComposerModelOverride(
  sessionId: string | null | undefined,
  value: string | null,
): void {
  if (!sessionId) return
  try {
    const key = `${STORAGE_PREFIX}${sessionId}`
    if (!value) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    /* ignore quota / private mode */
  }
}
