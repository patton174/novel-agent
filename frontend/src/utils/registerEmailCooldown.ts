type CooldownScope = 'register' | 'forgot'

const STORAGE_PREFIXES: Record<CooldownScope, string> = {
  register: 'na:register:email-cooldown:',
  forgot: 'na:forgot:email-cooldown:',
}

function storageKey(email: string, scope: CooldownScope): string {
  return STORAGE_PREFIXES[scope] + email.trim().toLowerCase()
}

export function writeEmailCooldown(email: string, seconds: number, scope: CooldownScope = 'register'): void {
  const until = Date.now() + seconds * 1000
  sessionStorage.setItem(storageKey(email, scope), String(until))
}

export function remainingEmailCooldownSec(email: string, scope: CooldownScope = 'register'): number {
  const raw = sessionStorage.getItem(storageKey(email, scope))
  if (!raw) return 0
  const until = Number(raw)
  if (!Number.isFinite(until)) return 0
  return Math.max(0, Math.ceil((until - Date.now()) / 1000))
}

export function clearEmailCooldown(email: string, scope: CooldownScope = 'register'): void {
  sessionStorage.removeItem(storageKey(email, scope))
}
