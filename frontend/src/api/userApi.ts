import { secureFetch } from '../security/secureFetch'
import { parseResultResponse, resolveErrorMessage } from '../utils/resultApi'
import type { UserProfile, UserRole } from '../stores/userStore'

interface UserInfoWire {
  userId?: string | number
  username?: string
  email?: string
  role?: string
  emailVerified?: boolean
}

function normalizeUserProfile(raw: UserInfoWire): UserProfile {
  return {
    userId: raw.userId != null ? String(raw.userId) : '',
    username: raw.username ?? '',
    email: raw.email ?? '',
    role: (raw.role as UserRole) ?? 'user',
    emailVerified: raw.emailVerified,
  }
}

export async function fetchUserInfo(): Promise<UserProfile> {
  const res = await secureFetch('/api/auth/auth/info')
  if (!res.ok) {
    let message = `加载用户信息失败 (${res.status})`
    try {
      const json = await res.json()
      if (json != null && typeof json === 'object') {
        const body = json as { msg?: string; message?: string }
        message = body.msg || body.message || message
      }
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  const raw = await parseResultResponse<UserInfoWire>(res)
  return normalizeUserProfile(raw)
}

export async function sendEmailVerifyLink(): Promise<void> {
  const res = await secureFetch('/api/auth/auth/send-email-verify', { method: 'POST' })
  if (!res.ok) {
    let json: unknown = null
    try {
      json = await res.json()
    } catch {
      json = null
    }
    throw new Error(resolveErrorMessage(json, res.status))
  }
  await parseResultResponse<null>(res)
}

export async function confirmEmailVerify(token: string, sig: string, exp: number): Promise<void> {
  const res = await secureFetch('/api/auth/api/confirm-email-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, sig, exp }),
  })
  if (!res.ok) {
    let message = '邮箱验证失败'
    try {
      const json = await res.json()
      if (json != null && typeof json === 'object') {
        const body = json as { msg?: string; message?: string }
        message = body.msg || body.message || message
      }
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  await parseResultResponse<null>(res)
}

export function needsEmailVerification(profile: UserProfile | null | undefined): boolean {
  if (!profile?.email) {
    return false
  }
  return profile.emailVerified !== true
}
