const THINKING_BLOCK = /<(?:think|redacted_thinking)>[\s\S]*?<\/(?:think|redacted_thinking)>/gi
const THINKING_TAGS = /<\/?(?:think|redacted_thinking)>/gi
const THINKING_CLOSE = /<\/(?:think|redacted_thinking)>/i
const THINKING_OPEN = /<(?:think|redacted_thinking)>/i
const CHOICE_BLOCK_BRACKET = /【选项\s*\d+】[\s\S]*?(?=【选项\s*\d+】|$)/g
const CHOICE_BLOCK_MARKDOWN = /\*\*选项\s*\d+\*\*[\s\S]*?(?=\*\*选项\s*\d+\*\*|$)/g

const CHOICE_MARKER = /(?:【选项\s*\d+】|\*\*选项\s*\d+\*\*)/

export interface StripChoiceOptions {
  /** 已在卡片中展示的选项标题，用于剔除正文中重复行 */
  choiceTitles?: string[]
}

/** 清理模型内部思考标记，避免渲染到 UI */
export function sanitizeThinkText(text: string): string {
  return text
    .replace(/\uFFFD/g, '')
    .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
    .replace(THINKING_BLOCK, '')
    .replace(THINKING_TAGS, '')
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t\u00a0\f\v\u3000]+/u, '')
    .replace(/[ \t\u00a0\f\v\u3000]+$/u, '')
}

function removeChoiceTitles(text: string, titles?: string[]): string {
  if (!titles?.length) {
    return text
  }
  let result = text
  for (const title of titles) {
    const trimmed = title.trim()
    if (!trimmed) {
      continue
    }
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), '')
  }
  return result
}

/** 保留选项引导语之前的正文（选项已在卡片区域展示） */
export function messageIntroBeforeChoices(text: string): string {
  const match = text.match(CHOICE_MARKER)
  if (!match || match.index === undefined) {
    return text
  }
  return text.slice(0, match.index).trim()
}

/** 正文中重复的选项块（已在选择卡片展示） */
export function stripChoiceBlocksFromMessage(text: string, options?: StripChoiceOptions): string {
  let stripped = text
    .replace(THINKING_BLOCK, '')
    .replace(THINKING_TAGS, '')
    .replace(CHOICE_BLOCK_BRACKET, '')
    .replace(CHOICE_BLOCK_MARKDOWN, '')
    .replace(/^.*【选项\s*\d+】.*$/gm, '')
    .replace(/(?:^|\n)\*\*选项\s*\d+\*\*[^\n]*/g, '')

  stripped = removeChoiceTitles(stripped, options?.choiceTitles)

  stripped = stripped
    .replace(/请告诉我您选择哪个方向[^\n]*/g, '')
    .replace(/或者如果您有之前写过的故事内容[^\n]*/g, '')
    .replace(/请选择您想要继续的写作方向[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return stripped
}

export function hasChoiceMarkers(text: string): boolean {
  return CHOICE_MARKER.test(text)
}

const THINK_ANALYSIS_BLOCK =
  /##\s*问题分析[\s\S]*?(?=\n---\n|\n##\s|\n\*\*建议|$)/

/** 剔除 think 工具泄漏到正文的内部分析块（整条消息收尾用，会 trim 首尾） */
export function stripThinkAnalysisFromMessage(text: string): string {
  return text.replace(THINK_ANALYSIS_BLOCK, '').replace(/\n{3,}/g, '\n\n').trim()
}

/** 去掉行首全角缩进，避免与 CSS text-indent 叠成「四格」 */
export function stripLineLeadingFullwidthIndent(line: string): string {
  return line.replace(/^[\u3000]+/u, '')
}

/** 流式拼接 message.delta：保留段内 \\n\\n，不对整段 trim */
export function appendMessageDeltaContent(previous: string, delta: string): string {
  const chunk = sanitizeMessageDeltaChunk(delta)
  if (!chunk) {
    return previous
  }
  const merged = `${previous}${chunk}`
  return merged.replace(THINK_ANALYSIS_BLOCK, '').replace(/\n{3,}/g, '\n\n')
}

const PROMPT_ECHO =
  /(?:创作模式：|写作任务：|前文\/章节内容|The user|We need to|Let's |目标字数：约)/i

/** 只去掉行首行尾的水平空白，保留 \\n（避免流式片段把段落换行 trim 掉） */
function stripHorizontalWhitespaceEnds(value: string): string {
  return value
    .replace(/^[ \t\u00a0\f\v\u3000]+/u, '')
    .replace(/[ \t\u00a0\f\v\u3000]+$/u, '')
}

/** 流式正文片段：丢弃思考块与提示词复述 */
export function sanitizeMessageDeltaChunk(text: string): string {
  if (!text) {
    return ''
  }
  if (THINKING_OPEN.test(text) && !THINKING_CLOSE.test(text)) {
    return ''
  }
  let chunk = text.replace(/\uFFFD/g, '')
  if (THINKING_CLOSE.test(chunk)) {
    chunk = chunk.split(THINKING_CLOSE).pop() ?? ''
  }
  chunk = stripHorizontalWhitespaceEnds(chunk.replace(THINKING_BLOCK, '').replace(THINKING_TAGS, ''))

  // 纯换行片段用于拼出 \\n\\n 分段，不得丢弃
  if (/^\n+$/.test(chunk)) {
    return chunk
  }

  const nonNewline = chunk.replace(/\n/g, '').trim()
  if (!nonNewline || PROMPT_ECHO.test(chunk)) {
    return ''
  }
  /** 正文后常见的创作说明 / 列举后续选项（与后端拦截对齐） */
  if (/续写完成[。\n]|你可以选择[：:]/.test(chunk)) {
    return ''
  }
  const letters = (chunk.match(/[a-zA-Z]/g) ?? []).length
  if (chunk.length > 120 && letters / chunk.length > 0.6) {
    return ''
  }
  return chunk
}

/** 整条助手消息最终清理 */
export function sanitizeAssistantMessage(text: string): string {
  return stripThinkAnalysisFromMessage(
    sanitizeThinkText(text).replace(THINKING_BLOCK, '').replace(THINKING_TAGS, ''),
  )
}
