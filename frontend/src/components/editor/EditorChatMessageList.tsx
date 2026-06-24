import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AgentChoiceOption, AgentInteractionPayload, AskUserAnswers } from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import { editorLayout } from '../../styles/theme'
import { EditorChatMessage } from './EditorChatMessage'
import { useAppMobile } from '@/hooks/useMediaQuery'

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
  onStreamResume?: (messageId: string) => void
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
  onStreamResume,
}: EditorChatMessageListProps) {
  const isMobile = useAppMobile()
  const activeId = activeStreamMessageId
  const loadingState = isLoading
  const scrubPlaying = marketingScrubPlaying
  const safeMessages = useMemo(
    () => (Array.isArray(messages) ? messages : []),
    [messages],
  )

  const thinkExpandedByMessage = useMemo(() => {
    const map = new Map<string, boolean | undefined>()
    for (const message of safeMessages) {
      const userThinkPinned = Object.prototype.hasOwnProperty.call(thinkPanelOpen, message.id)
      map.set(message.id, userThinkPinned ? thinkPanelOpen[message.id] : undefined)
    }
    return map
  }, [safeMessages, thinkPanelOpen])

  const streamScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setMessagesAreaNode = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof messagesAreaRef === 'function') {
        messagesAreaRef(node)
        return
      }
      if (messagesAreaRef && 'current' in messagesAreaRef) {
        const mutableRef = messagesAreaRef as { current: HTMLDivElement | null }
        mutableRef.current = node
      }
    },
    [messagesAreaRef],
  )

  useEffect(() => {
    if (!(scrubPlaying || (loadingState && activeId))) {
      return
    }
    if (streamScrollTimerRef.current) {
      clearTimeout(streamScrollTimerRef.current)
    }
    streamScrollTimerRef.current = setTimeout(() => {
      streamScrollTimerRef.current = null
      if (messagesEndRef && 'current' in messagesEndRef && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ block: 'end', behavior: 'auto' })
      }
    }, 120)
    return () => {
      if (streamScrollTimerRef.current) {
        clearTimeout(streamScrollTimerRef.current)
      }
    }
  }, [safeMessages.length, scrubPlaying, loadingState, activeId, messagesEndRef])

  return (
    <div
      ref={setMessagesAreaNode}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain py-3 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      style={{
        paddingBottom: composerBottomInset != null ? `${composerBottomInset}px` : '10.5rem',
      }}
    >
      <div
        className="relative mx-auto box-border w-full min-w-0 max-w-full pr-1"
        style={isMobile ? undefined : { maxWidth: editorLayout.contentMaxWidth }}
      >
        <div className="relative w-full min-w-0 max-w-full">
          {safeMessages.map((message, index) => (
            <div
              key={message.id}
              className={index < safeMessages.length - 1 ? 'pb-5' : undefined}
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
                onStreamResume={onStreamResume}
              />
            </div>
          ))}
          <div ref={messagesEndRef} className="h-px w-full shrink-0 scroll-mb-2" aria-hidden />
        </div>
      </div>
    </div>
  )
}
