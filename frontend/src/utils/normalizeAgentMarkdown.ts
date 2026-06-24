const FENCE = '```'

/** Shiki / GFM 语言位只允许 ASCII token；✅、中文等应回到正文第一行 */
const VALID_FENCE_LANG = /^[a-zA-Z0-9_+-]{1,32}$/

function normalizeFenceLanguageLine(info: string): string {
  const tag = info.trim()
  if (!tag) {
    return `${FENCE}text\n`
  }
  if (VALID_FENCE_LANG.test(tag)) {
    return `${FENCE}${tag}\n`
  }
  return `${FENCE}text\n${info}\n`
}

function normalizeFenceLanguageTags(text: string): string {
  if (!text.includes(FENCE)) {
    return text
  }

  let inFence = false
  let result = ''
  let i = 0

  while (i < text.length) {
    if (text.startsWith(FENCE, i)) {
      if (!inFence) {
        const newline = text.indexOf('\n', i + FENCE.length)
        if (newline === -1) {
          result += FENCE
          i += FENCE.length
          inFence = true
          continue
        }
        const info = text.slice(i + FENCE.length, newline)
        result += normalizeFenceLanguageLine(info)
        i = newline + 1
        inFence = true
        continue
      }

      result += FENCE
      i += FENCE.length
      inFence = false
      continue
    }

    result += text[i]
    i += 1
  }

  return result
}

type MarkdownSegment = { fenced: boolean; content: string }

/** 提取 ``` 围栏块，围栏内不做标题/列表/表格启发式改写 */
function splitPreservingFences(text: string): MarkdownSegment[] {
  if (!text.includes(FENCE)) {
    return [{ fenced: false, content: text }]
  }

  const segments: MarkdownSegment[] = []
  let cursor = 0
  const re = /```[^\n]*\n[\s\S]*?\n```/g

  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0
    if (start > cursor) {
      segments.push({ fenced: false, content: text.slice(cursor, start) })
    }
    segments.push({ fenced: true, content: match[0] })
    cursor = start + match[0].length
  }

  if (cursor < text.length) {
    segments.push({ fenced: false, content: text.slice(cursor) })
  }

  return segments.length > 0 ? segments : [{ fenced: false, content: text }]
}

function repairFlattenedNarrativeLines(text: string): string {
  let out = text
  out = out.replace(/\s+(✅\s*)/g, '\n\n$1')
  out = out.replace(/([：:])\s+(\d+\.)/g, '$1\n$2')
  out = out.replace(/(\d+\.\s[^\n]+?)\s+(?=\d+\.)/g, '$1\n')
  out = out.replace(/\s+(-\s)/g, '\n$1')
  return out.replace(/\n{3,}/g, '\n\n')
}

function repairFlattenedCodeBody(body: string): string {
  return repairFlattenedNarrativeLines(body.trim())
}

function fencedBodyNeedsRepair(body: string): boolean {
  const newlineCount = (body.match(/\n/g) ?? []).length
  if (newlineCount === 0) {
    return true
  }
  if (/\d+\.\s[^\n]+\s+\d+\./.test(body)) {
    return true
  }
  if (/✅/.test(body) && /✅[\s\S]*✅/.test(body)) {
    return true
  }
  return false
}

function repairFencedBlock(block: string): string {
  const openMatch = block.match(/^```([^\n]*)\n/)
  if (!openMatch) {
    return block
  }

  const lang = openMatch[1].trim()
  const inner = block.slice(openMatch[0].length)
  const closeIdx = inner.lastIndexOf('\n```')
  if (closeIdx === -1) {
    return block
  }

  const body = inner.slice(0, closeIdx)
  if (!fencedBodyNeedsRepair(body)) {
    return block
  }

  const repairedBody = repairFlattenedCodeBody(body)
  const langPrefix = lang ? `${lang}\n` : ''
  return `\`\`\`${langPrefix}${repairedBody}\n\`\`\``
}

/** 单行或粘连的 ```…``` 还原为独立围栏块 */
function repairInlineFencedBlocks(text: string): string {
  if (!text.includes(FENCE)) {
    return text
  }

  const parts = text.split(FENCE)
  if (parts.length < 3) {
    return text
  }

  let out = ''
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      out += repairFlattenedMarkdown(parts[i] ?? '')
      if (i < parts.length - 1) {
        out += `${out.endsWith('\n') || out.length === 0 ? '' : '\n\n'}${FENCE}`
      }
      continue
    }

    let chunk = parts[i] ?? ''
    const langMatch = chunk.match(/^(\w+)(\s|$)/)
    const lang =
      langMatch && /^[a-zA-Z0-9_-]{1,20}$/.test(langMatch[1]) ? langMatch[1] : ''
    const codeBody = lang ? chunk.slice(lang.length).trimStart() : chunk.trimStart()
    const repairedBody = repairFlattenedCodeBody(codeBody)
    out += lang
      ? `${lang}\n${repairedBody}\n${FENCE}\n`
      : `\n${repairedBody}\n${FENCE}\n`
  }

  return out.replace(/\n{3,}/g, '\n\n')
}

function normalizePlainMarkdown(text: string): string {
  let out = repairFlattenedMarkdown(text)
  out = out.replace(/\uFF5C/g, '|')
  out = out
    .replace(/^(#{1,6})([^\s#\n])/gm, '$1 $2')
    .replace(/^(\s*[-*+])([^\s\n*-])/gm, '$1 $2')
    .replace(/^(\s*\d+\.)([^\s])/gm, '$1 $2')
  out = out.replace(/([^\n|])\n(\|[^\n]+\|\s*\n\|[-:\s|]+\|)/g, '$1\n\n$2')
  return out
}

/**
 * 历史持久化或 SSE 合并后，正文有时被压成单行（表格/标题粘在一起），GFM 无法解析。
 * 仅在缺少结构化换行时做启发式还原，避免破坏已有格式。
 */
export function repairFlattenedMarkdown(text: string): string {
  if (!text?.trim()) {
    return ''
  }
  if (text.includes(FENCE)) {
    return repairInlineFencedBlocks(text)
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
  out = repairFlattenedNarrativeLines(out)
  return out.replace(/\n{3,}/g, '\n\n')
}

/**
 * LLM 常输出不符合 CommonMark 的格式，在交给 react-markdown 前规范化。
 * ``` 围栏内保持原样（仅做压行还原），围栏外才做标题/列表/表格修复。
 */
export function normalizeAgentMarkdown(text: string): string {
  if (!text) {
    return ''
  }

  const withFixedFences = normalizeFenceLanguageTags(text)
  const repaired = withFixedFences.includes(FENCE)
    ? repairInlineFencedBlocks(withFixedFences)
    : repairFlattenedMarkdown(withFixedFences)
  return splitPreservingFences(repaired)
    .map((segment) =>
      segment.fenced ? repairFencedBlock(segment.content) : normalizePlainMarkdown(segment.content),
    )
    .join('')
}
