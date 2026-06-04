import { AgentMarkdown } from '../AgentMarkdown'
import { TextBlockWrap } from './timelineStyles'

export function TimelineTextBlock({ content }: { content: string }) {
  if (!content.trim()) {
    return null
  }
  return (
    <TextBlockWrap>
      <AgentMarkdown text={content} variant="chat" />
    </TextBlockWrap>
  )
}
