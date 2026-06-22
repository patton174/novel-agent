import { useMemo } from 'react'
import { AgentMarkdown } from '../AgentMarkdown'
import { TIMELINE_TEXT_BLOCK } from '@/lib/timelineClasses'

export function TimelineTextBlock({ content }: { content: string }) {
  const trimmed = content.trim()
  const markdownNode = useMemo(
    () => <AgentMarkdown text={content} variant="pixel" />,
    [content],
  )
  if (!trimmed) {
    return null
  }
  return (
    <div className={TIMELINE_TEXT_BLOCK}>
      {markdownNode}
    </div>
  )
}
