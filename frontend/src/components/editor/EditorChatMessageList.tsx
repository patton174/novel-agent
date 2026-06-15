import { useCallback, useEffect, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { AgentChoiceOption, AgentInteractionPayload, AskUserAnswers } from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import { editorLayout } from '../../styles/theme'
import { EditorChatMessage } from './EditorChatMessage'

const MAX_VIRTUAL_ROWS = 5000
const FALLBACK_ROW_HEIGHT = 220

function safeRowCount(count: number): number {
  if (!Number.isFinite(count) || count <= 0) {
    return 0
  }
  return Math.min(Math.floor(count), MAX_VIRTUAL_ROWS)
}

export interface EditorChatMessageListProps {
  messages: EditorMessage[]
  isLoading: boolean
  activeStreamMessageId: string | null
  thinkPanelOpen: Record<string, boolean>
  onThinkPanelChange: (messageId: string, open: boolean) => void
  onSelectChoice: (choice: AgentChoiceOption) => void
  onSubmitInteraction: (
    interaction: AgentInteractionPayload,
    payload?: {
      choice?: AgentChoiceOption
      selected?: AgentChoiceOption[]
      customText?: string
      answers?: AskUserAnswers
    },
  ) => void
  messagesAreaRef: React.Ref<HTMLDivElement>
  messagesEndRef: React.Ref<HTMLDivElement>
  composerBottomInset?: number
  onEditUserMessage?: (content: string) => void
  marketingScrubPlaying?: boolean
  marketingPinOrchestration?: boolean
}

export function EditorChatMessageList({
  messages,
  isLoading,
  activeStreamMessageId,
  thinkPanelOpen,
  onThinkPanelChange,
  onSelectChoice,
  onSubmitInteraction,
  messagesAreaRef,
  messagesEndRef,
  composerBottomInset,
  onEditUserMessage,
  marketingScrubPlaying = false,
  marketingPinOrchestration = false,
}: EditorChatMessageListProps) {
  const activeId = activeStreamMessageId
  const loadingState = isLoading
  const scrubPlaying = marketingScrubPlaying
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)

  const safeMessages = Array.isArray(messages) ? messages : []
  const rowCount = safeRowCount(safeMessages.length)
  const streamActive = Boolean(scrubPlaying || (loadingState && activeId))
  // 流式期间行高持续变化，虚拟列表易在 getVirtualItems 内崩溃；短列表也无须虚拟化
  const virtualEnabled = scrollElement != null && rowCount > 24 && !streamActive

  const thinkExpandedByMessage = useMemo(() => {
    const map = new Map<string, boolean | undefined>()
    for (const message of safeMessages) {
      const userThinkPinned = Object.prototype.hasOwnProperty.call(thinkPanelOpen, message.id)
      map.set(message.id, userThinkPinned ? thinkPanelOpen[message.id] : undefined)
    }
    return map
  }, [safeMessages, thinkPanelOpen])

  const setMessagesAreaNode = useCallback(
    (node: HTMLDivElement | null) => {
      setScrollElement(node)
      if (typeof messagesAreaRef === 'function') {
        messagesAreaRef(node)
        return
      }
      if (messagesAreaRef && 'current' in messagesAreaRef) {
        ;(messagesAreaRef as { current: HTMLDivElement | null }).current = node
      }
    },
    [messagesAreaRef],
  )

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    enabled: virtualEnabled,
    getScrollElement: () => scrollElement,
    estimateSize: () => FALLBACK_ROW_HEIGHT,
    overscan: 8,
    measureElement: (el) => {
      const height = el?.getBoundingClientRect().height ?? 0
      return height > 0 ? height : FALLBACK_ROW_HEIGHT
    },
  })

  let useVirtualLayout = virtualEnabled
  let virtualItems: ReturnType<typeof rowVirtualizer.getVirtualItems> = []
  let totalHeight = 0
  if (virtualEnabled) {
    try {
      virtualItems = rowVirtualizer.getVirtualItems()
      totalHeight = rowVirtualizer.getTotalSize()
      if (!Array.isArray(virtualItems)) {
        useVirtualLayout = false
        virtualItems = []
        totalHeight = 0
      }
    } catch {
      useVirtualLayout = false
      virtualItems = []
      totalHeight = 0
    }
  }

  useEffect(() => {
    if (!scrollElement || rowCount === 0) {
      return
    }
    if (!(scrubPlaying || (loadingState && activeId))) {
      return
    }
    const raf = requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(rowCount - 1, { align: 'end' })
    })
    return () => cancelAnimationFrame(raf)
  }, [scrollElement, rowCount, scrubPlaying, loadingState, activeId, rowVirtualizer])

  const renderMessage = (message: EditorMessage, index: number, style?: React.CSSProperties) => (
    <div
      key={message.id}
      ref={style ? rowVirtualizer.measureElement : undefined}
      data-index={style ? index : undefined}
      className={index < safeMessages.length - 1 ? 'pb-5 max-md:pb-3.5' : undefined}
      style={style}
    >
      <EditorChatMessage
        message={message}
        isActiveStream={
          scrubPlaying ? message.id === activeId : loadingState && message.id === activeId
        }
        isLoading={scrubPlaying || loadingState}
        marketingScrubPlaying={scrubPlaying}
        marketingPinOrchestration={marketingPinOrchestration}
        thinkExpanded={thinkExpandedByMessage.get(message.id)}
        onThinkExpandedChange={(open) => {
          if (typeof onThinkPanelChange === 'function') {
            onThinkPanelChange(message.id, open)
          }
        }}
        onSelectChoice={onSelectChoice}
        onSubmitInteraction={onSubmitInteraction}
        onEditUserMessage={onEditUserMessage}
      />
    </div>
  )

  return (
    <div
      ref={setMessagesAreaNode}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain py-3 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      style={{
        paddingBottom: composerBottomInset != null ? `${composerBottomInset}px` : '10.5rem',
      }}
    >
      <div
        className="relative mx-auto w-full"
        style={{ maxWidth: editorLayout.contentMaxWidth }}
      >
        {useVirtualLayout ? (
          <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
            {virtualItems.map((virtualItem) => {
              const message = safeMessages[virtualItem.index]
              if (!message) {
                return null
              }
              return renderMessage(message, virtualItem.index, {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              })
            })}
            <div
              ref={messagesEndRef}
              className="absolute left-0 h-px w-full shrink-0 scroll-mb-2"
              style={{ top: `${Math.max(totalHeight - 1, 0)}px` }}
              aria-hidden
            />
          </div>
        ) : (
          <div className="relative w-full">
            {safeMessages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} className="h-px w-full shrink-0 scroll-mb-2" aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
}
