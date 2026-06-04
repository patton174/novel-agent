import type { AgentChoiceOption } from '../types/agent'

/** 解析 choose 工具返回的【选项N】文本为结构化选项 */
export function parseChooseOptions(text: string): AgentChoiceOption[] {
  if (!text?.trim()) {
    return []
  }

  const blocks = text.split(/【选项\s*\d+】/).map((b) => b.trim()).filter(Boolean)
  const options: AgentChoiceOption[] = []

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const titleMatch = block.match(/标题[：:]\s*(.+?)(?:\s{2,}|描述[：:]|$)/)
    const descMatch = block.match(/描述[：:]\s*([\s\S]+)/)
    const title = (titleMatch?.[1] ?? block.split('\n')[0] ?? `选项 ${i + 1}`).trim()
    const description = (descMatch?.[1] ?? '').trim()
    if (title) {
      options.push({
        id: `opt-${i + 1}`,
        title,
        description,
      })
    }
  }

  return options
}
