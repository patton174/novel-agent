import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useComposerSafeInset } from '../../hooks/editor/useComposerSafeInset'
import { ChatComposer, type ReferencedBookChip } from '../chat/ChatComposer'
import type {
  AgentChoiceOption,
  AgentContextUsage,
  AgentInteractionPayload,
  AskUserAnswers,
} from '../../types/agent'
import type { ComposerSpinnerMode } from '../../utils/deriveComposerSpinnerMode'
import type { EditorMessage } from '../../types/editor'
import { filterVisibleChatMessages, isInitialChatView } from '../../types/editor'
import type { Novel } from '../../types/novel'
import { editorLayout } from '../../styles/theme'
import { EditorChatMessageList } from './EditorChatMessageList'
import { StreamRecoveryIndicator } from '../chat/StreamRecoveryIndicator'
import { cn } from '@/lib/utils'
import { useAppMobile } from '@/hooks/useMediaQuery'

export interface EditorChatPanelProps {
  sessionTitle: string
  activeNovel: Novel | null
  messages: EditorMessage[]
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  modelOverride?: string | null
  onModelOverrideChange?: (value: string | null) => void
  onStreamPause: () => void
  onStreamResume: (messageId: string) => void
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
  spinnerMode?: ComposerSpinnerMode
  marketingScrubPlaying?: boolean
  marketingPinOrchestration?: boolean
  hideComposer?: boolean
  /** 移动端底部 TabBar 占位（px） */
  mobileBottomInset?: number
  referencedBooks?: ReferencedBookChip[]
  onReferencedBooksChange?: (books: ReferencedBookChip[]) => void
}

export function EditorChatPanel({
  sessionTitle,
  activeNovel,
  messages,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  modelOverride,
  onModelOverrideChange,
  onStreamPause,
  onStreamResume,
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
  spinnerMode = 'idle',
  marketingScrubPlaying = false,
  marketingPinOrchestration = false,
  hideComposer = false,
  mobileBottomInset = 0,
  referencedBooks = [],
  onReferencedBooksChange,
}: EditorChatPanelProps) {
  const { t } = useTranslation(['editor'])
  const isInitial = isInitialChatView(messages, activeNovel)
  const visibleMessages = filterVisibleChatMessages(messages ?? [], activeNovel)
  const composerRef = useRef<HTMLDivElement>(null)
  const isMobile = useAppMobile()
  const composerBottomInset = useComposerSafeInset(composerRef, !isInitial)
  const composerPadBottom = isMobile
    ? `${mobileBottomInset}px`
    : `calc(0.65rem + ${mobileBottomInset}px)`

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
          'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden box-border',
          isMobile ? 'px-2' : '',
        )}
        style={
          isMobile
            ? undefined
            : { paddingLeft: editorLayout.mainPaddingX, paddingRight: editorLayout.mainPaddingX }
        }
      >
        {hostBannerRecovering ? (
          <StreamRecoveryIndicator label={hostBannerText} className="z-[30]" />
        ) : null}

        {!isInitial && hostBannerText && !hostBannerRecovering ? (
          <div
            data-testid="host-mode-banner"
            className="z-[2] mb-1.5 w-full shrink-0 border-2 border-foreground bg-neon/20 px-3.5 py-2 text-center font-mono text-xs font-bold uppercase text-foreground shadow-soft"
            style={isMobile ? undefined : { maxWidth: editorLayout.contentMaxWidth }}
          >
            {hostBannerText}
          </div>
        ) : null}

        {!isInitial ? (
          <div
            className={cn(
              'relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden',
              !isMobile && 'mx-auto',
            )}
            style={isMobile ? undefined : { maxWidth: editorLayout.contentMaxWidth }}
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
              composerBottomInset={composerBottomInset + mobileBottomInset}
              onEditUserMessage={onEditUserMessage}
              onStreamResume={onStreamResume}
              marketingScrubPlaying={marketingScrubPlaying}
              marketingPinOrchestration={marketingPinOrchestration}
            />
            {!hideComposer ? (
              <div
                ref={composerRef}
                className={cn(
                  'absolute inset-x-0 bottom-0 z-[12] box-border w-full pointer-events-none [&>*]:pointer-events-auto',
                  isMobile
                    ? 'bg-background'
                    : 'bg-gradient-to-t from-background from-[12%] via-background/95 via-[42%] to-transparent',
                )}
                style={{ paddingBottom: composerPadBottom }}
              >
                <ChatComposer
                  value={inputValue}
                  onChange={onInputChange}
                  onSend={onSend}
                  isLoading={isLoading}
                  modelOverride={modelOverride}
                  onModelOverrideChange={onModelOverrideChange}
                  streamActive={isLoading}
                  spinnerMode={spinnerMode}
                  onStreamPause={onStreamPause}
                  onStreamAbort={onStreamAbort}
                  contextUsage={contextUsage}
                  referencedBooks={referencedBooks}
                  onReferencedBooksChange={onReferencedBooksChange}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div ref={messagesAreaRef} className="hidden" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center px-4">
              <p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                {t('editor:chat.emptyHint')}
              </p>
            </div>
          </>
        )}

        {!hideComposer && isInitial ? (
          <div
            ref={composerRef}
            className={cn(
              'absolute inset-x-0 bottom-0 z-[12] mx-auto box-border w-full pointer-events-none [&>*]:pointer-events-auto',
              'bg-gradient-to-t from-background from-[12%] via-background/95 via-[42%] to-transparent',
            )}
            style={{
              maxWidth: editorLayout.contentMaxWidth,
              paddingBottom: composerPadBottom,
            }}
          >
            <div className="mx-auto w-full">
              <ChatComposer
                value={inputValue}
                onChange={onInputChange}
                onSend={onSend}
                isLoading={isLoading}
                modelOverride={modelOverride}
                onModelOverrideChange={onModelOverrideChange}
                streamActive={isLoading}
                spinnerMode={spinnerMode}
                onStreamPause={onStreamPause}
                onStreamAbort={onStreamAbort}
                contextUsage={contextUsage}
                referencedBooks={referencedBooks}
                onReferencedBooksChange={onReferencedBooksChange}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
