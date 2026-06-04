import React from 'react'
import styled from 'styled-components'
import { palette } from '../../styles/theme'
import { useTypewriterStream } from '../../hooks/useTypewriterStream'

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
        <TypewriterParagraph key={pIdx}>
          <br />
        </TypewriterParagraph>
      )
    }

    return (
      <TypewriterParagraph key={pIdx}>
        {paraLines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {line}
            {lIdx < paraLines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </TypewriterParagraph>
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
    return <TypewriterWrap>{renderParagraphNodes(paragraphs)}</TypewriterWrap>
  }

  const visibleParagraphs = visible ? visible.split(/\n{2,}/) : ['']

  return (
    <TypewriterWrap data-testid="typewriter-stream">
      {renderParagraphNodes(visibleParagraphs)}
    </TypewriterWrap>
  )
}

const TypewriterWrap = styled.div`
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif;
  letter-spacing: 0.02em;
`

const TypewriterParagraph = styled.p`
  margin: 0 0 0.55rem;
  line-height: 1.85;
  color: ${palette.text};

  &:last-child {
    margin-bottom: 0;
  }
`
