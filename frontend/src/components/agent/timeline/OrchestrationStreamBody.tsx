import styled from 'styled-components'
import type { AgentTimelineBlock } from '../../../types/agent'
import { editorTheme } from '../../../styles/editorTheme'
import { AgentMarkdown } from '../AgentMarkdown'
import { OrchestrationNarration } from './timelineStyles'

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
    <OrchestrationNarration>
      {text.trim() ? <AgentMarkdown text={text} variant="chat" /> : null}
      {isLive ? <StreamCursor aria-hidden /> : null}
    </OrchestrationNarration>
  )
}

const StreamCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 0.95em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: ${editorTheme.accent};
  animation: blink 1s step-end infinite;

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`
