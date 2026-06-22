import type { AgentTimelineBlock } from '../../../types/agent'
import { OrchestrationNarrationRow } from './OrchestrationNarrationRow'

type StreamBodyBlock =
  | Extract<AgentTimelineBlock, { kind: 'narration' }>
  | Extract<AgentTimelineBlock, { kind: 'text' }>

/** 编排区叙述/正文：扁工具行 + 可选 branch 全文 */
export function OrchestrationStreamBody({
  block,
  streamLive,
  streamFinished,
}: {
  block: StreamBodyBlock
  streamLive: boolean
  streamFinished: boolean
}) {
  return (
    <OrchestrationNarrationRow
      text={block.content}
      streamLive={streamLive}
      streamFinished={streamFinished}
      frozen={block.frozen}
    />
  )
}
