import { clearToken, getAuthHeaders, setToken, setUserId } from './auth'

export interface LoginResult {
  token: string
  username: string
  role: string
  expiresIn: number
  userId?: number
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (body?.message) {
      return String(body.message)
    }
  } catch {
    // ignore
  }
  return `请求失败 (${response.status})`
}

/** 登录后解析用户 ID（供本机 PyAI 的 X-User-Id）；兼容旧版 auth 未返回 userId */
async function syncUserIdFromServer(): Promise<void> {
  const response = await fetch('/api/auth/info', {
    headers: { ...getAuthHeaders() },
  })
  if (!response.ok) {
    return
  }
  const data = (await response.json()) as { userId?: number; username?: string }
  if (data.userId != null) {
    setUserId(data.userId)
    return
  }
  // 旧版 /info 把 userId 放在 username 字段
  if (data.username) {
    setUserId(data.username)
  }
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = (await response.json()) as LoginResult
  setToken(data.token)
  if (data.userId != null) {
    setUserId(data.userId)
  } else {
    await syncUserIdFromServer()
  }
  return data
}

export async function register(
  username: string,
  password: string,
  email: string,
): Promise<void> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
}

export function logout(): void {
  clearToken()
}
