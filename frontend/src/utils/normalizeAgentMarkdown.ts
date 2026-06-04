/**
 * 历史持久化或 SSE 合并后，正文有时被压成单行（表格/标题粘在一起），GFM 无法解析。
 * 仅在缺少结构化换行时做启发式还原，避免破坏已有格式。
 */
export function repairFlattenedMarkdown(text: string): string {
  if (!text?.trim()) {
    return ''
  }
  const newlineCount = (text.match(/\n/g) ?? []).length
  if (newlineCount >= 2 || /\n\s*\|/m.test(text)) {
    return text
  }
  let out = text.replace(/\uFF5C/g, '|')
  // 仅处理「前文 + ##标题」粘连，避免把行首 ## 拆成两个 #
  out = out.replace(/([^\n#])(#{2,6})([^\s#\n|])/g, '$1\n\n$2 $3')
  out = out.replace(/([^\n|])(\|[^|\n]+\|[^|\n]*\|)/g, '$1\n$2')
  out = out.replace(/(\|[^|\n]+\|)\s*(\|[-:\s|]+\|)/g, '$1\n$2')
  out = out.replace(/([。！？；)])(\s*)([-*✅•]\s)/g, '$1\n$3')
  return out.replace(/\n{3,}/g, '\n\n')
}

/**
 * LLM 常输出不符合 CommonMark 的格式，在交给 react-markdown 前规范化。
 */
export function normalizeAgentMarkdown(text: string): string {
  if (!text) {
    return ''
  }
  let out = repairFlattenedMarkdown(text)
  out = out.replace(/\uFF5C/g, '|')
  out = out
    .replace(/^(#{1,6})([^\s#\n])/gm, '$1 $2')
    .replace(/^(\s*[-*+])([^\s\n*-])/gm, '$1 $2')
    .replace(/^(\s*\d+\.)([^\s])/gm, '$1 $2')
  // GFM 表格前需空行，否则常被当成普通段落
  out = out.replace(/([^\n|])\n(\|[^\n]+\|\s*\n\|[-:\s|]+\|)/g, '$1\n\n$2')
  return out
}
