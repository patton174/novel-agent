import type { AgentStepState, AgentTimelineBlock } from '../types/agent'
import { toolDisplayName } from './agentLabels'
import { ccToolHumanSubtitle } from './ccToolDisplay'
import { isAskUserTool } from './agentToolNames'

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
  agentTimeline?: AgentTimelineBlock[]
  agentSteps?: AgentStepState[]
  agentThinkText?: string
}

const WELCOME_MARKERS = [
  '你好！当前正在创作',
  '我已读取本书简介',
  '描述场景、人物或情节',
  '切换到「世界观」模式',
]

function isVerifiedAskUserChoice(
  block: Extract<AgentTimelineBlock, { kind: 'choice_selected' }>,
  steps?: AgentStepState[],
): boolean {
  if (!block.stepId?.trim() || !steps?.length) {
    return false
  }
  const step = steps.find((s) => s.stepId === block.stepId)
  if (!step || step.status !== 'completed') {
    return false
  }
  return isAskUserTool(step.toolName) || step.interaction?.type === 'ask_user'
}

function timelineChoiceTurns(
  timeline?: AgentTimelineBlock[],
  steps?: AgentStepState[],
): HistoryMessage[] {
  if (!timeline?.length) {
    return []
  }
  return timeline
    .filter((block): block is Extract<AgentTimelineBlock, { kind: 'choice_selected' }> => block.kind === 'choice_selected')
    .filter((block) => isVerifiedAskUserChoice(block, steps))
    .map((block) => {
      const title = block.title?.trim() ?? ''
      const desc = block.description?.trim()
      const content = desc && !title.includes(desc) ? `${title}（${desc}）` : title
      return content
        ? { role: 'user' as const, content: `我的回答：${content}` }
        : null
    })
    .filter((row): row is Extract<HistoryMessage, { role: 'user' }> => row !== null)
}

/** 单步工具的可展示摘要（供历史与回放复用） */
export function toolStepHistorySummary(step: AgentStepState): string | null {
  if (step.type !== 'tool' || step.status !== 'completed') {
    return null
  }
  const summary =
    step.outputSummary?.trim() ||
    step.displayExcerpt?.trim() ||
    step.detail?.trim() ||
    (step.resultLabels?.length ? step.resultLabels.join('、') : '') ||
    ccToolHumanSubtitle(step.toolName, {
      path: undefined,
      resultLabels: step.resultLabels,
      outputSummary: step.outputSummary,
    }) ||
    step.toolArgs?.trim()
  return summary || null
}

function stepHistoryLines(steps?: AgentStepState[]): string[] {
  if (!steps?.length) {
    return []
  }
  const lines: string[] = []
  for (const step of steps) {
    const summary = toolStepHistorySummary(step)
    if (!summary) {
      continue
    }
    const label = step.toolName ? toolDisplayName(step.toolName) : '工具'
    lines.push(`${label}：${summary}`)
  }
  return lines
}

/** 助手可见正文：content → timeline 文本 → 已完成工具摘要 */
export function assistantVisibleContent(message: HistoryMessage): string | null {
  const direct = message.content?.trim()
  if (direct) {
    return direct
  }

  const timelineText = (message.agentTimeline ?? [])
    .filter((block): block is Extract<AgentTimelineBlock, { kind: 'text' }> => block.kind === 'text')
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join('\n')
  if (timelineText.trim()) {
    return timelineText.trim()
  }

  const narrationText = (message.agentTimeline ?? [])
    .filter(
      (block): block is Extract<AgentTimelineBlock, { kind: 'narration' }> =>
        block.kind === 'narration',
    )
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join('\n')
  if (narrationText.trim()) {
    return narrationText.trim()
  }

  // Intentionally NOT a fallback: agentThinkText is private reasoning and must
  // never be replayed as assistant history content (see buildAgentHistory.test).
  const fromSteps = stepHistoryLines(message.agentSteps).join('\n')
  if (fromSteps.trim()) {
    return fromSteps.trim()
  }

  return null
}

export function isOnboardingAssistantContent(content: string): boolean {
  const text = content.trim()
  return WELCOME_MARKERS.some((marker) => text.includes(marker))
}

/** Flatten chat messages (and ask_user timeline selections) into agent history turns. */
export function expandMessagesForAgentHistory(messages: HistoryMessage[]): HistoryMessage[] {
  const expanded: HistoryMessage[] = []
  for (const message of messages) {
    if (message.role === 'assistant') {
      expanded.push(...timelineChoiceTurns(message.agentTimeline, message.agentSteps))
      const visible = assistantVisibleContent(message)
      if (visible) {
        expanded.push({ role: 'assistant', content: visible })
      }
      continue
    }
    const userContent = message.content?.trim()
    if (userContent) {
      expanded.push({ role: 'user', content: userContent })
    }
  }
  return expanded
}

/** 从聊天消息构建发给 Agent 的近期历史（默认不含本轮 message，由请求体 message 携带） */
export function buildAgentHistory(
  messages: HistoryMessage[],
  options?: {
    maxTurns?: number
    excludeOnboarding?: boolean
    excludeTrailingUser?: boolean
  },
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const maxTurns = options?.maxTurns ?? 24
  const excludeOnboarding = options?.excludeOnboarding !== false
  const expanded = expandMessagesForAgentHistory(messages)
  const filtered = expanded.filter((m) => {
    if (!m.content?.trim()) {
      return false
    }
    if (excludeOnboarding && m.role === 'assistant' && isOnboardingAssistantContent(m.content)) {
      return false
    }
    return true
  })

  const deduped: HistoryMessage[] = []
  for (const turn of filtered) {
    const prev = deduped[deduped.length - 1]
    if (prev && prev.role === turn.role && prev.content.trim() === turn.content.trim()) {
      continue
    }
    deduped.push(turn)
  }

  let slice = deduped.slice(-maxTurns * 2)
  if (options?.excludeTrailingUser !== false && slice.length > 0) {
    const last = slice[slice.length - 1]
    if (last.role === 'user') {
      slice = slice.slice(0, -1)
    }
  }
  return slice.map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }))
}
