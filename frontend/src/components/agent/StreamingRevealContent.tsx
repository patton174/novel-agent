import React from 'react'
import { useTypewriterStream } from '../../hooks/useTypewriterStream'
import {
  STREAMING_REVEAL_PARAGRAPH,
  STREAMING_REVEAL_WRAP,
} from '@/lib/agentChatClasses'

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
 * 助手正文：SSE 累积全文，展示层用 rAF 逐字追赶（打字机效果）。
 */
export function StreamingRevealContent({
  paragraphs,
  animate,
  messageKey,
}: StreamingRevealContentProps) {
  const fullText = paragraphs.join('\n\n')
  const { visible } = useTypewriterStream(fullText, {
    active: animate,
    resetKey: messageKey,
  })

  if (!animate) {
    return <div className={STREAMING_REVEAL_WRAP}>{renderParagraphNodes(paragraphs)}</div>
  }

  const visibleParagraphs = visible ? visible.split(/\n{2,}/) : ['']

  return (
    <div className={STREAMING_REVEAL_WRAP} data-testid="typewriter-stream">
      {renderParagraphNodes(visibleParagraphs)}
    </div>
  )
}
