import type {
  AgentChoiceOption,
  AgentInteractionPayload,
  AgentStepState,
  AgentTimelineBlock,
  AskUserAnswers,
} from '../../../types/agent'

export interface AssistantStreamTimelineProps {
  timeline: AgentTimelineBlock[]
  stepStates: AgentStepState[]
  streamLive: boolean
  streamFinished: boolean
  messageKey: string
  thinkExpanded?: boolean
  awaitingInteraction?: boolean
  fallbackThinkText?: string
  onThinkExpandedChange?: (expanded: boolean) => void
  onSelectChoice?: (choice: AgentChoiceOption) => void
  onSubmitInteraction?: (
    interaction: AgentInteractionPayload,
    payload?: {
      choice?: AgentChoiceOption
      selected?: AgentChoiceOption[]
      customText?: string
      answers?: AskUserAnswers
    },
  ) => void
  /** 营销分镜 scrub：保持编排层展开 */
  pinOrchestrationOpen?: boolean
  /** 未 completed 的 message.delta 缓冲（编排层流式展示） */
  streamingMessageContent?: string
  segmentOpen?: boolean
}
