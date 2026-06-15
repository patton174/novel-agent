/** 思考正文按行切分（保留空行用于流式滚动高度计算时可过滤） */
export function splitThinkLines(text: string, omitEmpty = false): string[] {
  const lines = text.split(/\r?\n/)
  return omitEmpty ? lines.filter((line) => line.trim().length > 0) : lines
}

/**
 * 流式：最多展示 maxLines 行（取尾部），由外层容器滚动；
 * 完成且未展开：仅最后一行非空内容。
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
  const lines = splitThinkLines(trimmed, true)
  if (lines.length === 0) {
    return trimmed
  }
  if (opts.isThinking) {
    return lines.slice(-maxLines).join('\n')
  }
  return lines[lines.length - 1] ?? ''
}
