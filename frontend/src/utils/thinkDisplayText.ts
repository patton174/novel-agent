/** 思考正文按行切分（保留空行用于流式滚动高度计算时可过滤） */
export function splitThinkLines(text: string, omitEmpty = false): string[] {
  const lines = text.split(/\r?\n/)
  return omitEmpty ? lines.filter((line) => line.trim().length > 0) : lines
}

/** 按中英文句界切分（保留句末标点） */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return []
  }
  const parts = trimmed.match(/[^。！？.!?]+[。！？.!?]?/gu)
  if (!parts?.length) {
    return [trimmed]
  }
  return parts.map((s) => s.trim()).filter(Boolean)
}

function stripListPrefix(line: string): string {
  return line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim()
}

/**
 * 编排区正文：仅最后一句话（末句），不是末行。
 * 模型常把多句写在同一行，按行切会把整段误当作「末句」。
 */
export function extractOrchestrationSummary(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  const sentences = splitSentences(trimmed)
  if (sentences.length > 1) {
    return stripListPrefix(sentences[sentences.length - 1] ?? trimmed)
  }
  const lines = splitThinkLines(trimmed, true)
  const last = lines[lines.length - 1] ?? trimmed
  return stripListPrefix(last)
}

/** 思考面板正文：去掉末句（末句仅展示在编排区 flat row） */
export function thinkBodyExcludingSummary(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  const sentences = splitSentences(trimmed)
  if (sentences.length > 1) {
    return sentences.slice(0, -1).join('').trim()
  }
  const lines = splitThinkLines(trimmed, true)
  if (lines.length <= 1) {
    return ''
  }
  return lines.slice(0, -1).join('\n')
}

/** 推理进行中：完整正文，不做末句拆分 */
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
  const maxLines = opts.maxLines ?? 3
  const lines = splitThinkLines(trimmed, true)
  if (lines.length === 0) {
    return trimmed
  }
  return lines.slice(-maxLines).join('\n')
}

/**
 * 思考完成后面板内正文（不含编排末句）：
 * - 展开：除末句外的全文
 * - 收起：空（末句在编排 flat row）
 */
export function formatThinkDisplayText(
  text: string,
  opts: { expanded: boolean; maxLines?: number },
): string {
  const body = thinkBodyExcludingSummary(text)
  const trimmed = body.trim()
  if (!trimmed) {
    return ''
  }
  if (opts.expanded) {
    return body
  }
  return ''
}
