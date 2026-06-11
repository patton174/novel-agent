/** 从 access JWT 读取 sub（userId），仅用于与后端 X-User-Id 对齐，不做签名校验 */
export function readUserIdFromAccessToken(token: string | null | undefined): string | null {
  if (!token?.trim()) return null
  try {
    const normalized = token.trim().replace(/^Bearer\s+/i, '')
    const payload = normalized.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { sub?: string | number }
    if (json.sub == null || json.sub === '') return null
    return String(json.sub)
  } catch {
    return null
  }
}
