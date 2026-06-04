import type { AgentStepState } from '../../../types/agent'
import { isAskUserTool, isCollapsibleReadTool } from '../../../utils/agentToolNames'
import {
  buildToolDetailSections,
  readToolBodyExcerpt,
  toolDetailHasExpandableContent,
} from '../../../utils/toolDetailFormat'
import { ScrollableToolExcerpt } from './ScrollableToolExcerpt'

/** 工具结果正文（无第二层树形符号，由 CcToolRow 统一提供 ⎿） */
export function ToolDetailPeek({
  step,
  mergedCallCount,
}: {
  step: AgentStepState
  mergedCallCount?: number
}) {
  if (isAskUserTool(step.toolName)) {
    return null
  }
  if (mergedCallCount && mergedCallCount > 1 && isCollapsibleReadTool(step.toolName)) {
    return null
  }
  if (!toolDetailHasExpandableContent(step)) {
    return null
  }

  let text: string | undefined
  if (isCollapsibleReadTool(step.toolName) && step.resultLabels?.length) {
    text = readToolBodyExcerpt(step)
  } else {
    text = buildToolDetailSections(step).output
  }

  if (!text?.trim()) {
    return null
  }

  return <ScrollableToolExcerpt text={text} />
}
