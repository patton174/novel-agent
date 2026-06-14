export interface ApiResult<T> {
  code: number
  msg: string
  data: T
  success?: boolean
}

/** Gateway 安全层 400 使用 message 字段，映射为可读中文 */
const GATEWAY_SECURITY_MESSAGES: Record<string, string> = {
  REPLAY_NONCE: '请求重复提交，请稍候再试',
  REPLAY_WINDOW: '请求已过期，请刷新页面后重试',
  'request sign required': '请求签名缺失，请刷新页面后重试',
  'AES envelope required': '请求加密异常，请刷新页面后重试',
  'decrypt failed': '请求解密失败，请刷新页面后重试',
  'unknown key id': '加密密钥已更新，请刷新页面后重试',
  'route prefix stale': '页面加密配置已过期，请刷新页面后重试',
  'invalid route cipher': '页面加密配置已过期，请刷新页面后重试',
  'bootstrap runtime missing': '页面加密配置缺失，请刷新页面后重试',
}

function isResultFailed(result: ApiResult<unknown>): boolean {
  if (typeof result.success === 'boolean') {
    return !result.success
  }
  return result.code !== 200
}

function mapGatewayMessage(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return raw
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as { msg?: string; message?: string }
      const inner = parsed.msg || parsed.message
      if (inner) {
        return GATEWAY_SECURITY_MESSAGES[inner] ?? inner
      }
    } catch {
      // fall through
    }
  }
  return GATEWAY_SECURITY_MESSAGES[trimmed] ?? trimmed
}

export function resolveErrorMessage(json: unknown, httpStatus: number): string {
  if (json != null && typeof json === 'object') {
    const body = json as { msg?: string; message?: string; code?: number }
    const raw = body.msg || body.message
    if (raw) {
      return mapGatewayMessage(String(raw))
    }
    if ('code' in body && typeof body.code === 'number') {
      return `请求失败 (${body.code})`
    }
  }
  if (typeof json === 'string' && json.trim()) {
    return mapGatewayMessage(json)
  }
  return `请求失败 (${httpStatus})`
}

export async function readApiErrorMessage(response: Response): Promise<string> {
  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  return resolveErrorMessage(json, response.status)
}

export function unwrapResult<T>(json: unknown, httpStatus?: number): T {
  if (json != null && typeof json === 'object' && 'code' in json) {
    const result = json as ApiResult<T>
    if (isResultFailed(result)) {
      throw new Error(resolveErrorMessage(result, result.code))
    }
    return result.data
  }
  throw new Error(`API Error: ${httpStatus ?? 'unknown'}`)
}

/** 非 Result 成功体（如 PyAI memory map）仅解析错误响应 */
export async function throwOnErrorResponse(response: Response): Promise<void> {
  if (response.ok) {
    return
  }
  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  throw new Error(resolveErrorMessage(json, response.status))
}

export async function parseResultResponse<T>(response: Response): Promise<T> {
  const json = await response.json()
  if (!response.ok) {
    throw new Error(resolveErrorMessage(json, response.status))
  }
  return unwrapResult<T>(json, response.status)
}
