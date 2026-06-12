import { toolExcerptClass } from '@/lib/timelineClasses'

export const TOOL_EXCERPT_MAX_LINES = 20

export function ScrollableToolExcerpt({ text }: { text: string }) {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  const lineCount = trimmed.split('\n').length
  const mono = /[├└│]/.test(trimmed)
  return (
    <div className={toolExcerptClass(lineCount, mono)}>
      {trimmed}
    </div>
  )
}
