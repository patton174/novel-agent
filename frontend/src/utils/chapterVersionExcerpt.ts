/** 版本历史摘要：取正文首段非空行，用于侧栏展示重点 */
export function chapterVersionExcerpt(content: string, maxLen = 56): string {
  const normalized = content.replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''

  const firstLine =
    normalized
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? normalized

  const compact = firstLine.replace(/\s+/g, ' ')
  if (compact.length <= maxLen) return compact
  return `${compact.slice(0, maxLen - 1)}…`
}
