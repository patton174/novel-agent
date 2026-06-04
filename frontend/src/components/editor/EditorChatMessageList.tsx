import { useMemo } from 'react'
import styled from 'styled-components'
import type { AgentChoiceOption, AgentInteractionPayload, AskUserAnswers } from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import { editorLayout } from '../../styles/editorTheme'
import { hideScrollbarCss } from '../../styles/theme'
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
  /** 悬浮输入框高度（px），用于底部留白 */
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
      map.set(
        message.id,
        userThinkPinned ? thinkPanelOpen[message.id] : undefined,
      )
    }
    return map
  }, [messages, thinkPanelOpen])

  return (
    <MessagesArea ref={messagesAreaRef} $bottomInset={composerBottomInset}>
      <MessagesInner>
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
            onThinkExpandedChange={(open) => onThinkPanelChange(message.id, open)}
            onSelectChoice={onSelectChoice}
            onSubmitInteraction={onSubmitInteraction}
            onEditUserMessage={onEditUserMessage}
          />
        ))}
        <ScrollEndAnchor ref={messagesEndRef} aria-hidden />
      </MessagesInner>
    </MessagesArea>
  )
}

const MessagesArea = styled.div<{ $bottomInset?: number }>`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 0.75rem 0;
  padding-bottom: ${({ $bottomInset }) =>
    $bottomInset != null ? `${$bottomInset}px` : '10.5rem'};
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
  ${hideScrollbarCss}
`

const ScrollEndAnchor = styled.div`
  flex-shrink: 0;
  width: 100%;
  height: 1px;
  scroll-margin-bottom: 0.5rem;
`

const MessagesInner = styled.div`
  width: 100%;
  max-width: ${editorLayout.contentMaxWidth};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`
