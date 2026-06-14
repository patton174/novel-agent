import type { AgentStepState, AgentTimelineBlock } from '../types/agent'
import type { EditorMessage } from '../types/editor'
import { isHiddenUiTool } from './agentHiddenTools'

export function extractAssistantDeliveryText(
  message: EditorMessage,
  timeline: AgentTimelineBlock[],
): string {
  const content = message.content?.trim()
  if (content) {
    return content
  }
  return timeline
    .filter((block): block is Extract<AgentTimelineBlock, { kind: 'text' }> => block.kind === 'text')
    .map((block) => block.content)
    .join('')
    .trim()
}

export function countOrchestrationSteps(
  stepStates: AgentStepState[] | undefined,
  timeline: AgentTimelineBlock[],
): number {
  const toolSteps = (stepStates ?? []).filter(
    (step) =>
      step.type === 'tool' &&
      step.toolName !== 'output' &&
      !isHiddenUiTool(step.toolName),
  )
  if (toolSteps.length > 0) {
    return toolSteps.length
  }
  return timeline.filter(
    (block) =>
      block.kind === 'tool' ||
      block.kind === 'think' ||
      block.kind === 'reasoning' ||
      block.kind === 'narration',
  ).length
}
