/** 思考正文按行切分（保留空行用于流式滚动高度计算时可过滤） */
export function splitThinkLines(text: string, omitEmpty = false): string[] {
  const lines = text.split(/\r?\n/)
  return omitEmpty ? lines.filter((line) => line.trim().length > 0) : lines
}

/** 编排区正文：推理/思考末句（末行非空内容，去掉列表符号） */
export function extractOrchestrationSummary(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  const lines = splitThinkLines(trimmed, true)
  const last = lines[lines.length - 1] ?? trimmed
  return last.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim()
}

/** 推理面板正文：去掉末句（末句仅展示在编排区正文） */
export function thinkBodyExcludingSummary(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  const lines = splitThinkLines(trimmed, true)
  if (lines.length <= 1) {
    return ''
  }
  return lines.slice(0, -1).join('\n')
}

/**
 * 思考面板内渲染的正文（不含编排末句）：
 * - 展开：除末句外的全文
 * - 思考中且未展开：尾部 maxLines 行（不含末句）
 * - 已完成且未展开：空（末句在编排正文行）
 */
export function formatThinkDisplayText(
  text: string,
  opts: { isThinking: boolean; expanded: boolean; maxLines?: number },
): string {
  const maxLines = opts.maxLines ?? 3
  const body = thinkBodyExcludingSummary(text)
  const trimmed = body.trim()
  if (!trimmed) {
    return ''
  }
  if (opts.expanded) {
    return body
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
