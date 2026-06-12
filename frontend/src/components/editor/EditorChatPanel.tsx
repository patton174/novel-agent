import { useRef } from 'react'
import { useComposerSafeInset } from '../../hooks/editor/useComposerSafeInset'
import { ChatComposer } from '../chat/ChatComposer'
import type {
  AgentChoiceOption,
  AgentContextUsage,
  AgentInteractionPayload,
  AskUserAnswers,
} from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import { filterVisibleChatMessages, isInitialChatView } from '../../types/editor'
import type { Novel } from '../../types/novel'
import { editorLayout } from '../../styles/theme'
import { EditorChatMessageList } from './EditorChatMessageList'
import { cn } from '@/lib/utils'

export interface EditorChatPanelProps {
  sessionTitle: string
  activeNovel: Novel | null
  messages: EditorMessage[]
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  hostModeEnabled: boolean
  onHostModeChange: (enabled: boolean) => void
  onStreamAbort: () => void
  hostBannerText?: string
  hostBannerRecovering?: boolean
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
  onEditUserMessage?: (content: string) => void
  contextUsage?: AgentContextUsage | null
  marketingScrubPlaying?: boolean
  marketingPinOrchestration?: boolean
  hideComposer?: boolean
}

export function EditorChatPanel({
  sessionTitle,
  activeNovel,
  messages,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  hostModeEnabled,
  onHostModeChange,
  onStreamAbort,
  hostBannerText,
  hostBannerRecovering,
  activeStreamMessageId,
  thinkPanelOpen,
  onThinkPanelChange,
  onSelectChoice,
  onSubmitInteraction,
  messagesAreaRef,
  messagesEndRef,
  onEditUserMessage,
  contextUsage,
  marketingScrubPlaying = false,
  marketingPinOrchestration = false,
  hideComposer = false,
}: EditorChatPanelProps) {
  const isInitial = isInitialChatView(messages, activeNovel)
  const visibleMessages = filterVisibleChatMessages(messages, activeNovel)
  const composerRef = useRef<HTMLDivElement>(null)
  const composerBottomInset = useComposerSafeInset(composerRef, !isInitial)

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      {!isInitial ? (
        <div
          className="shrink-0 bg-background pb-1.5 pt-2"
          style={{ paddingLeft: editorLayout.mainPaddingX, paddingRight: editorLayout.mainPaddingX }}
        >
          <h2 className="m-0 w-full truncate text-left text-[15px] font-semibold text-foreground">
            {sessionTitle}
          </h2>
        </div>
      ) : null}

      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-hidden box-border',
          isInitial && 'items-center justify-center',
        )}
        style={{ paddingLeft: editorLayout.mainPaddingX, paddingRight: editorLayout.mainPaddingX }}
      >
        {!isInitial && hostBannerText ? (
          <div
            data-testid="host-mode-banner"
            className={cn(
              'z-[2] mb-1.5 w-full shrink-0 rounded-[10px] px-3.5 py-2 text-center text-xs font-medium',
              hostBannerRecovering
                ? 'border border-amber-400/35 bg-amber-400/10 text-amber-800'
                : 'border border-primary/30 bg-primary/10 text-primary',
            )}
            style={{ maxWidth: editorLayout.contentMaxWidth }}
          >
            {hostBannerText}
          </div>
        ) : null}

        {!isInitial ? (
          <div
            className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden"
            style={{ maxWidth: editorLayout.contentMaxWidth }}
          >
            <EditorChatMessageList
              messages={visibleMessages}
              isLoading={isLoading}
              activeStreamMessageId={activeStreamMessageId}
              thinkPanelOpen={thinkPanelOpen}
              onThinkPanelChange={onThinkPanelChange}
              onSelectChoice={onSelectChoice}
              onSubmitInteraction={onSubmitInteraction}
              messagesAreaRef={messagesAreaRef}
              messagesEndRef={messagesEndRef}
              composerBottomInset={composerBottomInset}
              onEditUserMessage={onEditUserMessage}
              marketingScrubPlaying={marketingScrubPlaying}
              marketingPinOrchestration={marketingPinOrchestration}
            />
          </div>
        ) : (
          <div ref={messagesAreaRef} className="hidden" aria-hidden />
        )}

        {!hideComposer && (
          <div
            ref={composerRef}
            className={cn(
              'z-[12] mx-auto box-border w-full pointer-events-none [&>*]:pointer-events-auto',
              isInitial
                ? 'relative shrink-0 bg-transparent'
                : 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-background from-[12%] via-background/95 via-[42%] to-transparent',
            )}
            style={{
              maxWidth: editorLayout.contentMaxWidth,
              padding: isInitial ? `0 ${editorLayout.mainPaddingX}` : '0 0 0.65rem',
            }}
          >
            <div className="mx-auto w-full" style={{ maxWidth: editorLayout.contentMaxWidth }}>
              <ChatComposer
                value={inputValue}
                onChange={onInputChange}
                onSend={onSend}
                isLoading={isLoading}
                hostModeEnabled={hostModeEnabled}
                onHostModeChange={onHostModeChange}
                streamActive={isLoading}
                onStreamAbort={onStreamAbort}
                contextUsage={contextUsage}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
