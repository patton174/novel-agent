const HOST_MODE_KEY = 'novel_agent_host_mode'

export function readHostModePreference(): boolean {
  try {
    return localStorage.getItem(HOST_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeHostModePreference(enabled: boolean): void {
  try {
    localStorage.setItem(HOST_MODE_KEY, String(enabled))
  } catch {
    /* ignore quota / private mode */
  }
}
