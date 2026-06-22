/** Detect model-facing tool_use_error wrapper in tool output text. */
export function containsToolUseError(text: string | undefined): boolean {
  if (!text?.trim()) {
    return false
  }
  return /<tool_use_error[\s>][\s\S]*<\/tool_use_error>/i.test(text)
}

/** User-facing delivery must not repeat raw tool error payloads. */
export function isToolErrorLikeText(text: string | undefined): boolean {
  if (!text?.trim()) {
    return false
  }
  const trimmed = text.trim()
  return (
    containsToolUseError(trimmed) ||
    /^<tool_use_error[\s>]/i.test(trimmed)
  )
}

/** Single user-facing line from tool error payload. */
export function toolErrorPlainText(text: string): string {
  const tagged = text.match(/<tool_use_error>([\s\S]*?)<\/tool_use_error>/i)
  const body = (tagged?.[1] ?? text).trim()
  return body.replace(/^InputValidationError:\s*/i, '').trim()
}
