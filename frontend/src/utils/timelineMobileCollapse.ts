/** 移动端正文折叠阈值（字符数） */
export const DELIVERY_COLLAPSE_CHAR_THRESHOLD = 280

/** 移动端正文折叠阈值（行数） */
export const DELIVERY_COLLAPSE_LINE_THRESHOLD = 6

/** 移动端工具 excerpt 最大可见行数（桌面见 ScrollableToolExcerpt） */
export const TOOL_EXCERPT_MOBILE_MAX_LINES = 8

export function shouldCollapseDeliveryText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.length > DELIVERY_COLLAPSE_CHAR_THRESHOLD) return true
  return trimmed.split('\n').length > DELIVERY_COLLAPSE_LINE_THRESHOLD
}
