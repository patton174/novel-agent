/** 去掉与标题重复的「子任务完成」行，避免摘要区重复展示 */
export function stripSubagentSummaryDuplicate(
  summary: string,
  description: string,
): string {
  const body = summary.trim()
  if (!body) {
    return ''
  }

  const desc = description.trim()
  const lines = body.split('\n')
  const filtered: string[] = []

  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      if (filtered.length > 0) {
        filtered.push(line)
      }
      continue
    }
    if (/^#+\s*子任务完成/.test(t)) {
      if (desc && t.includes(desc.slice(0, 12))) {
        continue
      }
      if (!desc) {
        continue
      }
    }
    if (t === '**状态**：已完成（子 Agent run）' || t === '**状态**: 已完成（子 Agent run）') {
      continue
    }
    if (t === '### 摘要' && filtered.some((l) => /任务完成总结|优化完成总结/.test(l))) {
      continue
    }
    filtered.push(line)
  }

  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** 子代理 Markdown 摘要正文；strip 为空时回退原始 preview */
export function resolveSubagentSummaryBody(
  summaryPreview: string | undefined,
  description: string,
): string {
  const raw = (summaryPreview ?? '').trim()
  if (!raw) {
    return ''
  }
  const stripped = stripSubagentSummaryDuplicate(raw, description)
  return stripped.trim() || raw
}

/** 卡片一行摘要（去 Markdown 装饰，跳过纯标题行） */
export function subagentSummaryExcerpt(body: string, maxLen = 160): string {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const candidate =
    lines.find((line) => !/^#+\s/.test(line) && !/^[-*]\s/.test(line)) ?? lines[0] ?? ''
  const plain = candidate.replace(/[#*_`>]/g, '').trim()
  if (!plain) {
    return ''
  }
  if (plain.length <= maxLen) {
    return plain
  }
  return `${plain.slice(0, maxLen)}…`
}
