/** 思考正文按行切分（保留空行用于流式滚动高度计算时可过滤） */
export function splitThinkLines(text: string, omitEmpty = false): string[] {
  const lines = text.split(/\r?\n/)
  return omitEmpty ? lines.filter((line) => line.trim().length > 0) : lines
}

/** 推理进行中：完整正文，可截断末几行 */
export function formatThinkStreamingDisplay(
  text: string,
  opts: { expanded: boolean; maxLines?: number },
): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  if (opts.expanded) {
    return text
  }
  return text
}

/** 思考完成后面板内正文：展开显示全文，收起同样保留全文（由面板折叠控制可见性） */
export function formatThinkDisplayText(
  text: string,
  opts: { expanded: boolean; maxLines?: number },
): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  if (opts.expanded) {
    return text
  }
  const maxLines = opts.maxLines
  if (!maxLines || maxLines <= 0) {
    return text
  }
  const lines = splitThinkLines(trimmed, true)
  if (lines.length === 0) {
    return trimmed
  }
  return lines.slice(-maxLines).join('\n')
}
