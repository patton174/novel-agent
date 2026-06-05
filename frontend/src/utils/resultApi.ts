export interface ApiResult<T> {
  code: number
  msg: string
  data: T
  success?: boolean
}

function isResultFailed(result: ApiResult<unknown>): boolean {
  if (typeof result.success === 'boolean') {
    return !result.success
  }
  return result.code !== 200
}

export function unwrapResult<T>(json: unknown, httpStatus?: number): T {
  if (json != null && typeof json === 'object' && 'code' in json) {
    const result = json as ApiResult<T>
    if (isResultFailed(result)) {
      throw new Error(result.msg || `API Error: ${result.code}`)
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
  if (json != null && typeof json === 'object' && 'msg' in json) {
    throw new Error(String((json as { msg?: string }).msg || `API Error: ${response.status}`))
  }
  throw new Error(`API Error: ${response.status}`)
}

export async function parseResultResponse<T>(response: Response): Promise<T> {
  const json = await response.json()
  if (!response.ok) {
    if (json != null && typeof json === 'object' && 'msg' in json) {
      throw new Error(String((json as { msg?: string }).msg || `API Error: ${response.status}`))
    }
    throw new Error(`API Error: ${response.status}`)
  }
  return unwrapResult<T>(json, response.status)
}
