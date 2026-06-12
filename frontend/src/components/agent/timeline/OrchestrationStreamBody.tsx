import type { AgentTimelineBlock } from '../../../types/agent'
import { AgentMarkdown } from '../AgentMarkdown'
import { ORCHESTRATION_NARRATION, TIMELINE_STREAM_CURSOR } from '@/lib/timelineClasses'

type StreamBodyBlock =
  | Extract<AgentTimelineBlock, { kind: 'narration' }>
  | Extract<AgentTimelineBlock, { kind: 'text' }>

/** 编排区叙述/正文：SSE 增量追加，运行中即时展示全文 */
export function OrchestrationStreamBody({
  block,
  streamLive,
  streamFinished,
}: {
  block: StreamBodyBlock
  streamLive: boolean
  streamFinished: boolean
}) {
  const isLive = streamLive && !streamFinished && !block.frozen
  const text = block.content

  if (!text.trim() && !isLive) {
    return null
  }

  return (
    <div className={ORCHESTRATION_NARRATION}>
      {text.trim() ? <AgentMarkdown text={text} variant="chat" /> : null}
      {isLive ? <span className={TIMELINE_STREAM_CURSOR} aria-hidden /> : null}
    </div>
  )
}
