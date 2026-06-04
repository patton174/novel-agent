/** 从对话历史提取最近一段助手正文，供续写时作为 context_text */

const ONBOARDING_HINTS = [
  '你好！当前正在创作',
  '我已读取本书简介',
  '描述场景、人物或情节',
  '直接描述你想做的事',
]

function isOnboardingAssistantText(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return ONBOARDING_HINTS.some((hint) => t.includes(hint))
}

export function extractStoryContext(
  messages: Array<{ role: string; content?: string }>,
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    const content = msg.content?.trim()
    if (msg.role !== 'assistant' || !content) continue
    if (isOnboardingAssistantText(content)) continue
    return content
  }
  return undefined
}

export { isOnboardingAssistantText }
