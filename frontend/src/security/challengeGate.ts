import { verifySessionChallenge } from '../utils/authApi'
import { resolveTurnstileConfig } from '../utils/turnstile'

type ChallengeListener = () => void

let open = false
let pendingResolve: ((ok: boolean) => void) | null = null
const listeners = new Set<ChallengeListener>()

export function subscribeSecurityChallenge(listener: ChallengeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isSecurityChallengeOpen(): boolean {
  return open
}

function notify(): void {
  listeners.forEach((l) => l())
}

export function openSecurityChallenge(): Promise<boolean> {
  if (open && pendingResolve) {
    return new Promise((resolve) => {
      const prior = pendingResolve!
      pendingResolve = (ok) => {
        prior(ok)
        resolve(ok)
      }
    })
  }
  open = true
  notify()
  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

export function resolveSecurityChallenge(success: boolean): void {
  open = false
  const resolve = pendingResolve
  pendingResolve = null
  resolve?.(success)
  notify()
}

export async function runSecurityChallengeFlow(): Promise<boolean> {
  const config = await resolveTurnstileConfig()
  if (!config.turnstileEnabled || !config.turnstileSiteKey) {
    return false
  }
  const ok = await openSecurityChallenge()
  return ok
}

export async function submitSessionChallenge(turnstileToken: string): Promise<boolean> {
  try {
    await verifySessionChallenge(turnstileToken)
    resolveSecurityChallenge(true)
    return true
  } catch {
    resolveSecurityChallenge(false)
    return false
  }
}
