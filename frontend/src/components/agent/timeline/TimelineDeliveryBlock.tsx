import styled, { keyframes } from 'styled-components'
import { AgentMarkdown } from '../AgentMarkdown'
import { DeliveryBodyWrap } from './timelineStyles'
import { editorTheme } from '../../../styles/editorTheme'

/** 交付正文：无图标，左缘与编排层同级对齐 */
export function TimelineDeliveryBlock({
  text,
  streamLive = false,
  testId = 'assistant-delivery-body',
}: {
  text: string
  streamLive?: boolean
  testId?: string
}) {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  return (
    <DeliveryBodyWrap data-testid={testId}>
      <AgentMarkdown text={trimmed} variant="chat" />
      {streamLive ? <StreamCursor aria-hidden /> : null}
    </DeliveryBodyWrap>
  )
}

const blink = keyframes`
  50% { opacity: 0; }
`

const StreamCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 0.95em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: ${editorTheme.accent};
  animation: ${blink} 1s step-end infinite;
`
