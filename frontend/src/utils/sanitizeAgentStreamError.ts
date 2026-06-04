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
    return '写入失败：缺少 file_path。请指定章节 VFS 路径（如 /novel/…/chapters/<uuid>.md），不能仅传 content。'
  }
  if (/incomplete chunked read|peer closed connection/i.test(withoutPrefix)) {
    return '连接已断开，部分事件可能未完整接收。请重试或刷新页面。'
  }
  if (withoutPrefix.length > 280) {
    return `${withoutPrefix.slice(0, 277)}…`
  }
  return withoutPrefix
}
