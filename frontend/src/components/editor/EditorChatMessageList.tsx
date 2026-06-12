import { useMemo } from 'react'
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
  const thinkExpandedByMessage = useMemo(() => {
    const map = new Map<string, boolean | undefined>()
    for (const message of messages) {
      const userThinkPinned = Object.prototype.hasOwnProperty.call(thinkPanelOpen, message.id)
      map.set(message.id, userThinkPinned ? thinkPanelOpen[message.id] : undefined)
    }
    return map
  }, [messages, thinkPanelOpen])

  return (
    <div
      ref={messagesAreaRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain py-3 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      style={{
        paddingBottom: composerBottomInset != null ? `${composerBottomInset}px` : '10.5rem',
      }}
    >
      <div
        className="mx-auto flex w-full flex-col gap-5 max-md:gap-3.5"
        style={{ maxWidth: editorLayout.contentMaxWidth }}
      >
        {messages.map((message) => (
          <EditorChatMessage
            key={message.id}
            message={message}
            isActiveStream={
              marketingScrubPlaying
                ? message.id === activeStreamMessageId
                : isLoading && message.id === activeStreamMessageId
            }
            isLoading={marketingScrubPlaying || isLoading}
            marketingScrubPlaying={marketingScrubPlaying}
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
        ))}
        <div ref={messagesEndRef} className="h-px w-full shrink-0 scroll-mb-2" aria-hidden />
      </div>
    </div>
  )
}
