import React from 'react'
import { useTypewriterBuffer } from '../../hooks/useTypewriterStream'
import {
  STREAMING_REVEAL_PARAGRAPH,
  STREAMING_REVEAL_WRAP,
} from '@/lib/agentChatClasses'
import { cn } from '@/lib/utils'

export interface StreamingRevealContentProps {
  paragraphs: string[]
  animate: boolean
  /** 用于稳定 React key（同一条助手消息 id） */
  messageKey: string
}

function renderParagraphNodes(paragraphs: string[]): React.ReactNode {
  return paragraphs.map((para, pIdx) => {
    const paraLines = para.split('\n')
    const isSingleEmpty = paraLines.length === 1 && paraLines[0] === ''

    if (isSingleEmpty) {
      return (
        <p key={pIdx} className={STREAMING_REVEAL_PARAGRAPH}>
          <br />
        </p>
      )
    }

    return (
      <p key={pIdx} className={STREAMING_REVEAL_PARAGRAPH}>
        {paraLines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {line}
            {lIdx < paraLines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </p>
    )
  })
}

/**
 * 助手正文：SSE 累积全文，展示层用 rAF 逐字追赶 + 渐变渐显。
 */
export function StreamingRevealContent({
  paragraphs,
  animate,
  messageKey,
}: StreamingRevealContentProps) {
  const fullText = paragraphs.join('\n\n')
  const { visible, isTyping } = useTypewriterBuffer(fullText, {
    resetKey: messageKey,
    playing: animate,
    finished: !animate,
    maxCharsPerFrame: 2,
  })

  if (!animate) {
    return (
      <div className={cn(STREAMING_REVEAL_WRAP, 'agent-stream-gradient-body')}>
        {renderParagraphNodes(paragraphs)}
      </div>
    )
  }

  const visibleParagraphs = visible ? visible.split(/\n{2,}/) : ['']

  return (
    <div
      className={cn(
        STREAMING_REVEAL_WRAP,
        'agent-stream-gradient-body agent-stream-gradient-body--live',
        'agent-stream-delivery-live',
      )}
      data-testid="typewriter-stream"
    >
      <div className={cn('agent-stream-reveal-text', animate && 'agent-stream-reveal-text--active')}>
        {renderParagraphNodes(visibleParagraphs)}
        {isTyping ? (
          <span
            className="agent-stream-caret ml-px inline-block w-[2px] animate-pulse bg-primary align-baseline"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  )
}
