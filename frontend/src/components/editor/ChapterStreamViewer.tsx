import { useEffect, useRef } from 'react'
import { useTypewriterBuffer } from '../../hooks/useTypewriterStream'
import { createDebouncedScrollToBottom } from '../../utils/debouncedScroll'
import { cn } from '@/lib/utils'

export interface ChapterStreamViewerProps {
  content: string
  streaming: boolean
  /** 章节流会话 key（title 或 chapterId） */
  streamKey: string
  className?: string
}

/**
 * Agent 写章流式正文：rAF 逐字揭示 + 渐变渐显 + 防抖自动滚底。
 */
export function ChapterStreamViewer({
  content,
  streaming,
  streamKey,
  className,
}: ChapterStreamViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { visible, isTyping } = useTypewriterBuffer(content, {
    resetKey: streamKey,
    playing: streaming,
    finished: !streaming,
    maxCharsPerFrame: 3,
  })

  useEffect(() => {
    const scroller = createDebouncedScrollToBottom(() => scrollRef.current, 80)
    scroller.scrollToBottom(true)
    return scroller.dispose
  }, [streamKey])

  useEffect(() => {
    if (!streaming) return
    const scroller = createDebouncedScrollToBottom(() => scrollRef.current, 80)
    scroller.scrollToBottom()
    return scroller.dispose
  }, [visible, streaming])

  return (
    <div
      ref={scrollRef}
      className={cn(
        'min-h-full w-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      data-testid="chapter-stream-viewer"
    >
      <div
        className={cn(
          'agent-stream-gradient-body relative min-h-full w-full',
          streaming && 'agent-stream-gradient-body--live',
        )}
      >
        <pre
          className={cn(
            'm-0 whitespace-pre-wrap border-none bg-transparent font-serif leading-loose tracking-wide text-foreground outline-none',
            'agent-stream-reveal-text',
            streaming && 'agent-stream-reveal-text--active',
          )}
          aria-live="polite"
        >
          {visible}
          {streaming && isTyping ? (
            <span className="agent-stream-caret ml-px inline-block w-[2px] animate-pulse bg-primary align-baseline" aria-hidden />
          ) : null}
        </pre>
      </div>
    </div>
  )
}
