import type { AgentStreamUiState } from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import {
  applyAgentEvent,
  createInitialAgentStreamUiState,
  finalizeAgentMessageContent,
} from '../agentStreamState'
import { deriveAssistantStreamPhase } from '../agentStreamPhase'

export type MarketingSceneId = 'orchestrate' | 'subagent'

function eventsForProgress(events: Array<[string, string]>, progress: number): Array<[string, string]> {
  if (progress >= 0.995) {
    return events
  }
  return events.filter(([name]) => name !== 'stream-end')
}

/** 滚动进度 → 已播放事件数（每步占等长区间，避免 ceil 一次跳多步） */
export function sceneEventCountForProgress(progress: number, total: number): number {
  if (total <= 0 || progress <= 0.06) {
    return 0
  }
  if (progress >= 0.995) {
    return total
  }
  const start = 0.1
  const end = 0.94
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)))
  return Math.min(total, 1 + Math.floor(t * total))
}

function eventCountForProgress(progress: number, total: number): number {
  return sceneEventCountForProgress(progress, total)
}

function applyEvents(events: Array<[string, string]>, progress: number): AgentStreamUiState {
  const playable = eventsForProgress(events, progress)
  const count = eventCountForProgress(progress, playable.length)
  let state = createInitialAgentStreamUiState()
  for (let i = 0; i < count; i++) {
    const [event, raw] = playable[i]!
    state = applyAgentEvent(state, event, raw)
  }
  return state
}

function assistantFromState(state: AgentStreamUiState, id: string): EditorMessage {
  return {
    id,
    role: 'assistant',
    content: finalizeAgentMessageContent(state),
    timestamp: new Date(),
    agentThinkText: state.thinkText || undefined,
    agentSteps: state.stepStates.length > 0 ? [...state.stepStates] : undefined,
    agentActiveToolCount: state.activeToolCount,
    agentIsThinking: state.isThinking,
    agentStreamPaused: state.streamPaused,
    agentStreamPhase: deriveAssistantStreamPhase(state),
    agentTimeline: state.timeline.length > 0 ? [...state.timeline] : undefined,
    agentTodos: state.todos?.length ? [...state.todos] : undefined,
  }
}

const ORCHESTRATE_USER = '继续写第二章，先对齐记忆和第一章结尾。'

/** 第一幕：记忆 + 读前一章 */
const ORCHESTRATE_EVENTS: Array<[string, string]> = [
  [
    'agent-event',
    JSON.stringify({
      type: 'think.delta',
      step_id: 'think-orch',
      payload: { text: '续写前先拉取角色记忆，并阅读第一章结尾以对齐语气与伏笔。' },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.started',
      step_id: 'tool-mem',
      payload: {
        name: 'memory_read',
        input: { path: 'memory/characters/Tang_Yun' },
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.completed',
      step_id: 'tool-mem',
      payload: {
        name: 'memory_read',
        output: '命中 Tang_Yun、势力格局、天赋设定',
        display_excerpt: '角色卡 · 世界观',
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.started',
      step_id: 'tool-ch1',
      payload: {
        name: 'chapter_read',
        input: { chapter_id: 'ch-01', title: '第一章 · 天赋觉醒' },
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.completed',
      step_id: 'tool-ch1',
      payload: {
        name: 'chapter_read',
        output: '已读取第一章结尾',
        display_excerpt: '《第一章 · 天赋觉醒》\n…银月森林入口，铁剑生锈',
        result_labels: ['第一章 · 天赋觉醒'],
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.started',
      step_id: 'tool-plan',
      payload: { name: 'plan', input: { task: '第二章结构' } },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.completed',
      step_id: 'tool-plan',
      payload: { name: 'plan', output: '首战 → 掉宝 → 章末钩子' },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'message.delta',
      payload: {
        text: '雨水顺着他的发梢滑落，每一滴都像是敲打在心上的钟声。',
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'message.delta',
      payload: {
        text: '他深吸一口气，握紧了拳头——银月森林的首战，从现在开始。',
      },
    }),
  ],
  ['stream-end', 'done'],
]

const SUBAGENT_USER = '启动子代理校对角色一致性，再进入正文续写。'

/** 第二幕：子代理专屏 */
const SUBAGENT_EVENTS: Array<[string, string]> = [
  [
    'agent-event',
    JSON.stringify({
      type: 'think.delta',
      step_id: 'think-sub',
      payload: { text: '主会话保持简洁，角色校对交给子代理并行处理。' },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.started',
      step_id: 'parent-agent',
      payload: {
        name: 'Agent',
        input: { description: '子代理 · 角色校对' },
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'subagent.started',
      step_id: 'parent-agent',
      payload: {
        parent_step_id: 'parent-agent',
        description: '子代理 · 角色校对',
        child_run_id: 'child-demo-1',
        max_turns: 12,
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'subagent.progress',
      step_id: 'parent-agent',
      payload: {
        parent_step_id: 'parent-agent',
        phase: 'tool_done',
        tool: 'memory_read',
        title: '读取角色卡',
        excerpt: 'Tang_Yun 人设无冲突',
        child_step_id: 'sub-mem',
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'subagent.progress',
      step_id: 'parent-agent',
      payload: {
        parent_step_id: 'parent-agent',
        phase: 'tool_done',
        tool: 'output',
        title: '校对摘要',
        excerpt: '已同步至记忆',
        child_step_id: 'sub-out',
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'subagent.completed',
      step_id: 'parent-agent',
      payload: {
        parent_step_id: 'parent-agent',
        summary_preview: '角色校对完成，可安全续写第二章。',
      },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'tool.completed',
      step_id: 'parent-agent',
      payload: { name: 'Agent', output: '子代理结果已合并' },
    }),
  ],
  [
    'agent-event',
    JSON.stringify({
      type: 'message.delta',
      payload: {
        text: '角色校对完成，记忆已同步。可以开始续写第二章正文。',
      },
    }),
  ],
  ['stream-end', 'done'],
]

const SCENE_META: Record<
  MarketingSceneId,
  { userPrompt: string; events: Array<[string, string]> }
> = {
  orchestrate: { userPrompt: ORCHESTRATE_USER, events: ORCHESTRATE_EVENTS },
  subagent: { userPrompt: SUBAGENT_USER, events: SUBAGENT_EVENTS },
}

export function scenePlayableEventCount(scene: MarketingSceneId): number {
  return SCENE_META[scene].events.filter(([name]) => name !== 'stream-end').length
}

export function buildSceneMessages(scene: MarketingSceneId, progress: number): EditorMessage[] {
  const total = scenePlayableEventCount(scene)
  const step = sceneEventCountForProgress(progress, total)
  return buildSceneMessagesAtStep(scene, step, progress >= 0.995)
}

/** 按已播放事件步数构建消息（用于定时循环演示） */
export function buildSceneMessagesAtStep(
  scene: MarketingSceneId,
  eventStep: number,
  includeStreamEnd = false,
): EditorMessage[] {
  const { userPrompt, events } = SCENE_META[scene]
  const user: EditorMessage = {
    id: `demo-user-${scene}`,
    role: 'user',
    content: userPrompt,
    timestamp: new Date(),
  }
  if (eventStep <= 0) {
    return [user]
  }

  const playable = events.filter(([name]) => name !== 'stream-end')
  const count = Math.min(eventStep, playable.length)
  let state = createInitialAgentStreamUiState()
  for (let i = 0; i < count; i++) {
    const [event, raw] = playable[i]!
    state = applyAgentEvent(state, event, raw)
  }
  if (includeStreamEnd) {
    state = applyAgentEvent(state, 'stream-end', 'done')
  }

  return [user, assistantFromState(state, `demo-assistant-${scene}`)]
}

/** 营销演示：助手回复进行中（含最终流式正文，不含 stream-end） */
export function sceneIsStreaming(eventStep: number, total: number): boolean {
  return eventStep > 0 && eventStep <= total
}

/** 营销演示：保持编排层展开 + 流式打字机动画 */
export function scenePlaybackLive(eventStep: number, total: number): boolean {
  return eventStep > 0 && eventStep <= total
}

/** @deprecated 滚动 scrub 遗留，请用 scenePlaybackLive */
export function sceneScrubPlaying(progress: number): boolean {
  return progress > 0.03 && progress < 0.995
}
