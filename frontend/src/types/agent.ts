export interface AgentContextThresholds {
  contextLimit: number
  compressThresholdTokens: number
  warningThresholdTokens: number
}

export interface AgentContextUsage {
  turn: number
  promptTokens: number
  contextLimit: number
  contextPercent: number
  percentLeft?: number
  runInputTokens: number
  runOutputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  compressed: boolean
  compactNote?: string
  sections?: Record<string, number>
  source?: 'api' | 'estimate' | string
  thresholds?: AgentContextThresholds
  lastCompactMode?: string
}

export interface AgentChoiceOption {
  id: string
  title: string
  description: string
}

export type AgentTodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface AgentTodoItem {
  id: string
  content: string
  status: AgentTodoStatus
}

/** Slim SSE envelope (Java gateway v2 — no legacy fat fields). */
export interface AgentEventEnvelope {
  type: string
  sequence: number
  step_id?: string
  parent_step_id?: string | null
  run_id?: string
  session_id?: string
  message_id?: string
  payload: AgentEventPayload
}

export interface ToolCompletedPayload {
  name?: string
  display_name?: string
  status?: 'ok' | 'error'
  output?: string
  output_summary?: string
  result_labels?: string[]
  action_label?: string
  choices?: AgentChoiceOption[]
  interaction?: AgentInteractionPayload
  todos?: AgentTodoItem[]
  context_patch?: { todos?: AgentTodoItem[] }
}

export type AgentEventPayload = Record<string, unknown> & Partial<ToolCompletedPayload>

export interface AskUserQuestion {
  id: string
  prompt: string
  type: 'single_select' | 'multi_select' | 'user_input'
  options?: AgentChoiceOption[]
  free_text_hint?: string
}

export interface AskUserAnswers {
  [questionId: string]: {
    selected?: AgentChoiceOption[]
    choice?: AgentChoiceOption
    input?: string
  }
}

export interface AgentInteractionPayload {
  type: 'single_select' | 'multi_select' | 'user_input' | 'confirm' | 'refine' | 'ask_user'
  prompt?: string
  free_text_hint?: string
  allow_custom?: boolean
  min_select?: number
  max_select?: number
  options?: AgentChoiceOption[]
  questions?: AskUserQuestion[]
}

export interface AgentSubagentLogEntry {
  id: string
  phase: string
  title: string
  tool?: string
  status?: 'started' | 'completed' | 'failed'
  excerpt?: string
  turn?: number
  /** VFS 路径（与主 Agent tool.started file_path 一致） */
  filePath?: string
  displayName?: string
  resultLabels?: string[]
  toolInput?: Record<string, unknown>
  /** 本轮推理是否仍在流式输出（reasoning.completed 后为 false） */
  reasoningOpen?: boolean
}

export interface AgentSubagentState {
  description: string
  childRunId?: string
  status: 'active' | 'done' | 'failed'
  maxTurns?: number
  turn?: number
  /** 子 Agent 编排推理（对齐主 Agent reasoning / 思考块） */
  thinkText?: string
  logs: AgentSubagentLogEntry[]
  summaryPreview?: string
  error?: string
}

export interface AgentStepState {
  stepId: string
  parentStepId?: string | null
  type: string
  status: 'started' | 'completed' | 'failed'
  title: string
  toolName?: string
  /** CC-style parenthetical after tool name, e.g. memory/foo.md */
  toolArgs?: string
  /** SSE tool_input — 调用参数 */
  toolInput?: Record<string, unknown>
  toolInputText?: string
  /** SSE output — 仅 UI（Glob/Grep 清单、错误详情）；模型正文不走此字段 */
  toolOutputDetail?: string
  /** SSE display_excerpt — 给用户看的摘要（无 id / 行号） */
  displayExcerpt?: string
  detail?: string
  outputSummary?: string
  resultLabels?: string[]
  choices?: AgentChoiceOption[]
  interaction?: AgentInteractionPayload
  /** TodoWrite 合并后的任务清单 */
  todos?: AgentTodoItem[]
  /** Write/Edit 流式正文字数累计（避免每 chunk 拼接超大 excerpt） */
  chapterStreamChars?: number
  /** Agent 工具派发的子 Agent 进度 */
  subagent?: AgentSubagentState
}

/** 单次助手应答在 UI 上的阶段（对齐常见 Agent Chat 心智模型） */
export type AgentAssistantStreamPhase =
  | 'connecting'
  | 'planning'
  | 'tool_running'
  | 'streaming'
  | 'waiting'
  | 'completed'
  | 'error'

export interface AgentStreamUiState {
  thinkText: string
  stepStates: AgentStepState[]
  activeToolCount: number
  messageContent: string
  isStreamEnded: boolean
  /** run.completed / run.failed（早于 stream-end，用于收起光标） */
  runTerminalAck: boolean
  isThinking: boolean
  /** run.failed */
  streamError?: string
  runId?: string
  /** 托管守护：自动恢复提示 */
  hostGuardMessage?: string
  /** choose 结果已结构化展示时，从正文中剥离重复选项文本 */
  stripChoiceBlockFromMessage: boolean
  /** TodoWrite 最新合并清单（整条消息级） */
  todos?: AgentTodoItem[]
  /** 按发生顺序：思考 → 正文 → 工具 → 正文 … */
  timeline: AgentTimelineBlock[]
  /** 已应用的 SSE/WS 事件序号，避免双通道重复 */
  seenSequences: number[]
  /** 已应用的 event_id（双通道去重，优先于 sequence） */
  seenEventIds?: string[]
  /** run.waiting：等待用户点选，应走 WS 而非新开发消息 */
  awaitingInteraction?: boolean
  /** run.paused：用户手动暂停步进 */
  streamPaused?: boolean
  /** Claude Code 风格上下文占用 */
  contextUsage?: AgentContextUsage
}

export type AgentTimelineBlock =
  | { kind: 'reasoning'; id: string; text: string; status: 'active' | 'done' }
  | { kind: 'think'; id: string; text: string; status: 'active' | 'done' }
  | { kind: 'transition'; id: string; title: string; status?: 'active' | 'done' }
  | { kind: 'tool'; id: string; stepId: string }
  | {
      kind: 'choice_selected'
      id: string
      title: string
      description?: string
      /** 关联的 choose / ask_user 工具 step */
      stepId?: string
    }
  | { kind: 'text'; id: string; content: string; frozen: boolean }
  | { kind: 'narration'; id: string; content: string; frozen: boolean }

export type ThinkIntensity = 'light' | 'medium' | 'deep'

export interface AgentHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentStreamRequestBody {
  message: string
  /** @deprecated 不再由用户选择；后端固定 auto，由 Agent 根据描述判断任务 */
  mode?: string
  /** 托管模式：长时任务、后台持续盯防 */
  host_mode?: boolean
  /** 当前章节/编辑器正文，供 Agent 自主判断是否可直接续写 */
  context_text?: string
  /** 稳定会话 ID，多轮编排与记忆 */
  session_id?: string
  /** 近期对话（不含本条用户消息） */
  history?: AgentHistoryTurn[]
  /** 当前小说 / 章节，供 Agent 上下文与章节工具 */
  novel_id?: string
  chapter_id?: string
}
