import { useCallback, useEffect, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { AgentChoiceOption, AgentInteractionPayload, AskUserAnswers } from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import { editorLayout } from '../../styles/theme'
import { EditorChatMessage } from './EditorChatMessage'

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

  const thinkExpandedByMessage = useMemo(() => {
    const map = new Map<string, boolean | undefined>()
    for (const message of messages) {
      const userThinkPinned = Object.prototype.hasOwnProperty.call(thinkPanelOpen, message.id)
      map.set(message.id, userThinkPinned ? thinkPanelOpen[message.id] : undefined)
    }
    return map
  }, [messages, thinkPanelOpen])

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
    count: messages.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 220,
    overscan: 8,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 0,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalHeight = rowVirtualizer.getTotalSize()

  useEffect(() => {
    if (!scrollElement || messages.length === 0) {
      return
    }
    if (!(scrubPlaying || (loadingState && activeId))) {
      return
    }
    const raf = requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
    })
    return () => cancelAnimationFrame(raf)
  }, [scrollElement, messages, messages.length, scrubPlaying, loadingState, activeId, rowVirtualizer])

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
        <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
          {virtualItems.map((virtualItem) => {
            const message = messages[virtualItem.index]
            if (!message) {
              return null
            }
            return (
              <div
                key={message.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualItem.index}
                className={virtualItem.index < messages.length - 1 ? 'pb-5 max-md:pb-3.5' : undefined}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <EditorChatMessage
                  message={message}
                  isActiveStream={
                    scrubPlaying
                      ? message.id === activeId
                      : loadingState && message.id === activeId
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
          })}
          <div
            ref={messagesEndRef}
            className="absolute left-0 h-px w-full shrink-0 scroll-mb-2"
            style={{ top: `${Math.max(totalHeight - 1, 0)}px` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
