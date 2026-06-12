import type { Novel } from '../types/novel'

export function buildWelcomeMessage(novel: Novel | null | undefined): string {
  if (!novel) {
    return '你好！我是 Novel Agent 的智能创作助手。\n\n描述一个场景、人物或情节，我可以帮你续写故事。'
  }

  const lines = [`你好！当前正在创作《${novel.title}》。`]
  if (novel.description?.trim()) {
    lines.push('', '我已读取本书简介/设定，会据此续写与扩展世界观。')
  } else {
    lines.push('', '可在左侧编辑本书简介，或在对话中补充设定，我会纳入上下文。')
  }
  lines.push('', '直接描述你想做的事（续写、改稿、整理角色/世界观、扩写大纲等），我会自动判断并执行。')
  return lines.join('\n')
}
