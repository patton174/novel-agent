import { AgentMarkdown } from '../AgentMarkdown'
import { TIMELINE_TEXT_BLOCK } from '@/lib/timelineClasses'

export function TimelineTextBlock({ content }: { content: string }) {
  if (!content.trim()) {
    return null
  }
  return (
    <div className={TIMELINE_TEXT_BLOCK}>
      <AgentMarkdown text={content} variant="chat" />
    </div>
  )
}
