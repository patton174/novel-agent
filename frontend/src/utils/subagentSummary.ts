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

import type { AgentSubagentLogEntry } from '../types/agent'

/** 编排区内已展示的思考/推理正文（用于去重外部交付） */
export function collectSubagentOrchestrationProse(
  logs: AgentSubagentLogEntry[],
  thinkText?: string,
): string {
  const parts: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | undefined) => {
    const text = raw?.trim() ?? ''
    if (!text || seen.has(text)) {
      return
    }
    seen.add(text)
    parts.push(text)
  }
  push(thinkText)
  for (const log of logs) {
    if (log.phase === 'reasoning') {
      push(log.excerpt)
    }
  }
  return parts.join('\n\n').trim()
}

function stripLeadingOrchestrationOverlap(
  delivery: string,
  orchestrationProse: string,
): string {
  const body = delivery.trim()
  const orch = orchestrationProse.trim()
  if (!body || !orch) {
    return body
  }
  if (body === orch) {
    return ''
  }
  if (body.startsWith(orch)) {
    const rest = body.slice(orch.length).replace(/^\s+/, '')
    return rest || body
  }
  const orchParas = orch.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const lastPara = orchParas[orchParas.length - 1]
  if (lastPara && lastPara.length >= 24 && body.startsWith(lastPara)) {
    const rest = body.slice(lastPara.length).replace(/^\s+/, '')
    if (rest) {
      return rest
    }
  }
  return body
}

/**
 * 子 Agent 编排层外的交付正文：去掉与编排思考重复的前缀，避免展开编排时与外部正文重复。
 */
export function extractSubagentTrailingDelivery(
  summary: string | undefined,
  orchestrationProse: string,
): string {
  const raw = summary?.trim() ?? ''
  if (!raw) {
    return ''
  }
  return stripLeadingOrchestrationOverlap(raw, orchestrationProse)
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
