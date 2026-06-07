const STORAGE_KEY = 'na:seen-routes'

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set()
  }
}

function writeSeen(seen: Set<string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
  } catch {
    /* quota / private mode */
  }
}

export function hasRouteBeenSeen(pathname: string): boolean {
  return readSeen().has(pathname)
}

export function markRouteSeen(pathname: string): void {
  const seen = readSeen()
  if (seen.has(pathname)) return
  seen.add(pathname)
  writeSeen(seen)
}
