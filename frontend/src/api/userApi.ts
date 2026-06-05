import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
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
    throw new Error('Failed to load user info')
  }
  const raw = await parseResultResponse<UserInfoWire>(res)
  return normalizeUserProfile(raw)
}
