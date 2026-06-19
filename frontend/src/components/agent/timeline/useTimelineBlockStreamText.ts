import { useTypewriterBuffer } from '../../../hooks/useTypewriterStream'

/** 流式正文：SSE 追加 target，展示层用 rAF 丝滑追赶（含推理/编排块） */
export function useTimelineBlockStreamText(
  block: { id: string; text: string; status: 'active' | 'done' },
  messageKey: string,
  streamLive: boolean,
  streamFinished: boolean,
  maxCharsPerFrame: number,
): {
  displayText: string
  isTyping: boolean
  liveStream: boolean
  isThinking: boolean
} {
  const streamingActive =
    streamLive && !streamFinished && block.status === 'active'
  const { visible, isTyping } = useTypewriterBuffer(block.text, {
    resetKey: `${messageKey}-${block.id}`,
    playing: streamingActive,
    finished: streamFinished || !streamLive || block.status === 'done',
    maxCharsPerFrame,
  })
  const liveStream = streamingActive
  const isThinking = block.status === 'active' && streamLive && !streamFinished
  const showFullText = streamFinished || !streamLive || block.status === 'done'
  return {
    displayText: showFullText ? block.text : visible,
    isTyping,
    liveStream,
    isThinking,
  }
}
