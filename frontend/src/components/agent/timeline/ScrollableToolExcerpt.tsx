import { useEditorMobile } from '@/hooks/useMediaQuery'
import { toolExcerptClass } from '@/lib/timelineClasses'
import { TOOL_EXCERPT_MOBILE_MAX_LINES } from '@/utils/timelineMobileCollapse'

export const TOOL_EXCERPT_MAX_LINES = 20

export function ScrollableToolExcerpt({ text }: { text: string }) {
  const isMobile = useEditorMobile()
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  const lineCount = trimmed.split('\n').length
  const mono = /[├└│]/.test(trimmed)
  const maxLines = isMobile ? TOOL_EXCERPT_MOBILE_MAX_LINES : TOOL_EXCERPT_MAX_LINES
  return (
    <div className={toolExcerptClass(lineCount, mono, maxLines)}>
      {trimmed}
    </div>
  )
}
