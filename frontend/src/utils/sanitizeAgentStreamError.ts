import i18n from '@/i18n'

/** 将 tool_use_error 转为用户可读的错误文案 */
export function sanitizeAgentStreamError(raw: string | undefined): string {
  const text = (raw ?? '').trim()
  if (!text) {
    return ''
  }
  const tagged = text.match(/<tool_use_error>([\s\S]*?)<\/tool_use_error>/i)
  const body = (tagged?.[1] ?? text).trim()
  const withoutPrefix = body.replace(/^InputValidationError:\s*/i, '').trim()
  if (withoutPrefix.includes('Write requires both `file_path`')) {
    return i18n.t('editor:agent.stream.writeMissingFilePath')
  }
  if (/incomplete chunked read|peer closed connection/i.test(withoutPrefix)) {
    return i18n.t('editor:agent.stream.connectionIncomplete')
  }
  if (withoutPrefix.length > 280) {
    return `${withoutPrefix.slice(0, 277)}…`
  }
  return withoutPrefix
}
