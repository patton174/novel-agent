import i18n from '@/i18n'
import { parseJsonWithSafeIds } from './jsonSafeIds'

export interface ApiResult<T> {
  code: number
  msg: string
  data: T
  success?: boolean
}

/** Gateway 安全层 400 使用 message 字段，映射为 i18n 键 */
const GATEWAY_SECURITY_CODES: Record<string, string> = {
  REPLAY_NONCE: 'errors.api.gateway.REPLAY_NONCE',
  REPLAY_WINDOW: 'errors.api.gateway.REPLAY_WINDOW',
  'request sign required': 'errors.api.gateway.requestSignRequired',
  'AES envelope required': 'errors.api.gateway.aesEnvelopeRequired',
  'decrypt failed': 'errors.api.gateway.decryptFailed',
  'unknown key id': 'errors.api.gateway.unknownKeyId',
  'route prefix stale': 'errors.api.gateway.routePrefixStale',
  'invalid route cipher': 'errors.api.gateway.invalidRouteCipher',
  'bootstrap runtime missing': 'errors.api.gateway.bootstrapRuntimeMissing',
}

function translateGatewayCode(raw: string): string | undefined {
  const key = GATEWAY_SECURITY_CODES[raw]
  return key ? i18n.t(key) : undefined
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
        return translateGatewayCode(inner) ?? inner
      }
    } catch {
      // fall through
    }
  }
  return translateGatewayCode(trimmed) ?? trimmed
}

export function resolveErrorMessage(json: unknown, httpStatus: number): string {
  if (json != null && typeof json === 'object') {
    const body = json as { msg?: string; message?: string; code?: number }
    const raw = body.msg || body.message
    if (raw) {
      return mapGatewayMessage(String(raw))
    }
    if ('code' in body && typeof body.code === 'number') {
      return i18n.t('errors.api.requestFailed', { code: body.code })
    }
  }
  if (typeof json === 'string' && json.trim()) {
    return mapGatewayMessage(json)
  }
  return i18n.t('errors.api.requestFailed', { code: httpStatus })
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
  throw new Error(i18n.t('errors.api.apiError', { status: httpStatus ?? 'unknown' }))
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
  const text = await response.text()
  const json = parseJsonWithSafeIds(text)
  if (!response.ok) {
    throw new Error(resolveErrorMessage(json, response.status))
  }
  return unwrapResult<T>(json, response.status)
}
