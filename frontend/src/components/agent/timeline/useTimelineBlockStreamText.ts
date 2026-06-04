import { useTypewriterBuffer } from '../../../hooks/useTypewriterStream'

/** 流式正文：active 时跟 SSE 全文；done 后不再打字重播；仅未完成且非 live 时用打字机 */
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
  const { visible, isTyping } = useTypewriterBuffer(block.text, {
    resetKey: `${messageKey}-${block.id}`,
    playing: streamLive && !streamFinished,
    finished: streamFinished || !streamLive,
    maxCharsPerFrame,
  })
  const liveStream = streamLive && !streamFinished && block.status === 'active'
  const isThinking = block.status === 'active' && streamLive && !streamFinished
  const showFullText =
    liveStream || streamFinished || !streamLive || block.status === 'done'
  return {
    displayText: showFullText ? block.text : visible,
    isTyping,
    liveStream,
    isThinking,
  }
}
