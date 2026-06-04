/** Detect model-facing tool_use_error wrapper in tool output text. */
export function containsToolUseError(text: string | undefined): boolean {
  if (!text?.trim()) {
    return false
  }
  return /<tool_use_error>[\s\S]*<\/tool_use_error>/i.test(text)
}

/** Single user-facing line from tool error payload. */
export function toolErrorPlainText(text: string): string {
  const tagged = text.match(/<tool_use_error>([\s\S]*?)<\/tool_use_error>/i)
  const body = (tagged?.[1] ?? text).trim()
  return body.replace(/^InputValidationError:\s*/i, '').trim()
}
