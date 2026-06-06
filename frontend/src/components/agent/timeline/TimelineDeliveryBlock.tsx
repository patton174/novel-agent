import { AgentMarkdown } from '../AgentMarkdown'
import { DeliveryBodyWrap } from './timelineStyles'

/** 交付正文：无图标，左缘与编排层同级对齐 */
export function TimelineDeliveryBlock({
  text,
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
    </DeliveryBodyWrap>
  )
}
