/** 从 Read/Grep（含 legacy memory_read）output 文本提取条目标题（仅展示名，不含正文） */
export function parseMemoryReadTitles(text: string | undefined): string[] {
  if (!text?.trim()) {
    return []
  }
  const seen = new Set<string>()
  const titles: string[] = []
  const push = (raw: string) => {
    const t = raw.trim()
    if (!t || seen.has(t)) {
      return
    }
    seen.add(t)
    titles.push(t)
  }

  for (const line of text.split('\n')) {
    const titleLine = line.match(/^\s*-\s*title:\s*(.+)$/i)
    if (titleLine) {
      push(titleLine[1])
      continue
    }
    const bullet = line.match(/^\s*[-*]\s*([^:：]+)[：:]/)
    if (bullet) {
      push(bullet[1])
    }
  }

  const roster = text.match(/共\s*\d+\s*人[：:]\s*([^\n]+)/)
  if (roster) {
    for (const part of roster[1].split(/[,，、]/)) {
      push(part)
    }
  }

  if (titles.length === 0) {
    const single = text.match(/[·•]\s*([^：:]+)[：：]/)
    if (single) {
      push(single[1])
    }
  }

  return titles
}

/** 从 Write/Edit/Delete（含 legacy memory_*）工具结果提取可读目标描述 */
export function parseMemoryActionLabel(text: string | undefined): string | null {
  if (!text?.trim()) {
    return null
  }
  const line = text.split('\n')[0].trim()
  if (
    /^(已更新|已写入|已创建|已删除|读取|记忆更新失败|创建失败|删除失败|读取失败)/.test(
      line,
    ) ||
    line.includes('创作记忆')
  ) {
    return line.length > 100 ? `${line.slice(0, 100)}…` : line
  }
  const titles = parseMemoryReadTitles(text)
  if (titles.length > 0) {
    return titles.length > 4 ? `已读：${titles.slice(0, 4).join('、')} 等${titles.length}项` : `已读：${titles.join('、')}`
  }
  return null
}

export function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const label of labels) {
    const t = label.trim()
    if (!t || seen.has(t)) {
      continue
    }
    seen.add(t)
    out.push(t)
  }
  return out
}
