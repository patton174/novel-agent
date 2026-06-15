/** 思考正文按行切分（保留空行用于流式滚动高度计算时可过滤） */
export function splitThinkLines(text: string, omitEmpty = false): string[] {
  const lines = text.split(/\r?\n/)
  return omitEmpty ? lines.filter((line) => line.trim().length > 0) : lines
}

/**
 * 思考面板内渲染的正文：
 * - 展开：全文
 * - 思考中且未展开：尾部 maxLines 行（流式窗口）
 * - 已完成且未展开：空（点击标题展开看全文）
 */
export function formatThinkDisplayText(
  text: string,
  opts: { isThinking: boolean; expanded: boolean; maxLines?: number },
): string {
  const maxLines = opts.maxLines ?? 3
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  if (opts.expanded) {
    return text
  }
  if (!opts.isThinking) {
    return ''
  }
  const lines = splitThinkLines(trimmed, true)
  if (lines.length === 0) {
    return trimmed
  }
  return lines.slice(-maxLines).join('\n')
}

/** @deprecated 编排区不再拆分「末句」；保留供旧测试/回放兼容 */
export function extractOrchestrationSummary(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  const lines = splitThinkLines(trimmed, true)
  const last = lines[lines.length - 1] ?? trimmed
  return last.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim()
}

/** @deprecated */
export function thinkBodyExcludingSummary(text: string): string {
  return text.trim()
}
