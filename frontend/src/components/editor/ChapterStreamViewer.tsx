import { useEffect, useRef, type RefObject } from 'react'
import { useTypewriterBuffer } from '../../hooks/useTypewriterStream'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_MONO_WRAP } from '@/lib/editorPixelClasses'

export interface ChapterStreamViewerProps {
  content: string
  streaming: boolean
  /** 章节流会话 key（title 或 chapterId） */
  streamKey: string
  /** 正文区外层滚动容器（EditorStoryPanel 的 overflow-y-auto） */
  scrollRootRef?: RefObject<HTMLElement | null>
  className?: string
}

function scrollToBottom(el: HTMLElement | null) {
  if (!el) return
  el.scrollTop = el.scrollHeight
}

/**
 * Agent 写章流式正文：rAF 逐字揭示 + 渐变渐显 + 跟随滚动。
 */
export function ChapterStreamViewer({
  content,
  streaming,
  streamKey,
  scrollRootRef,
  className,
}: ChapterStreamViewerProps) {
  const fallbackScrollRef = useRef<HTMLDivElement>(null)

  const resolveScrollEl = () => scrollRootRef?.current ?? fallbackScrollRef.current

  const { visible, isTyping } = useTypewriterBuffer(content, {
    resetKey: streamKey,
    playing: streaming,
    finished: !streaming,
    maxCharsPerFrame: 10,
  })

  useEffect(() => {
    scrollToBottom(resolveScrollEl())
  }, [streamKey, scrollRootRef])

  useEffect(() => {
    if (!streaming) return
    let raf = 0
    const loop = () => {
      scrollToBottom(resolveScrollEl())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [streaming, streamKey, scrollRootRef])

  return (
    <div
      ref={scrollRootRef ? undefined : fallbackScrollRef}
      className={cn(
        scrollRootRef ? 'min-h-full w-full' : 'min-h-full w-full overflow-y-auto',
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
            'm-0 whitespace-pre-wrap border-none bg-transparent text-[0.9rem] leading-[1.72] text-foreground outline-none',
            EDITOR_PIXEL_MONO_WRAP,
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
