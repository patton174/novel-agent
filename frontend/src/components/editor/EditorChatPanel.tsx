import { useRef } from 'react'
import styled from 'styled-components'
import { useComposerSafeInset } from '../../hooks/editor/useComposerSafeInset'
import { ChatComposer } from '../chat/ChatComposer'
import type { AgentChoiceOption, AgentContextUsage, AgentInteractionPayload, AskUserAnswers } from '../../types/agent'
import type { EditorMessage } from '../../types/editor'
import {
  filterVisibleChatMessages,
  isInitialChatView,
} from '../../types/editor'
import type { Novel } from '../../types/novel'
import { editorLayout, editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { EditorChatMessageList } from './EditorChatMessageList'

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
  /** 首页营销分镜：滚动 scrub 时保持流式态，驱动编排动画 */
  marketingScrubPlaying?: boolean
  /** 首页营销分镜：scrub 时强制展开编排层 */
  marketingPinOrchestration?: boolean
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
}: EditorChatPanelProps) {
  const isInitial = isInitialChatView(messages, activeNovel)
  const visibleMessages = filterVisibleChatMessages(messages, activeNovel)
  const composerRef = useRef<HTMLDivElement>(null)
  const composerBottomInset = useComposerSafeInset(composerRef, !isInitial)

  return (
    <ChatSection $initial={isInitial}>
      {!isInitial ? (
        <ChatTopBar>
          <ChatTopTitle>{sessionTitle}</ChatTopTitle>
        </ChatTopBar>
      ) : null}

      <ChatViewport $initial={isInitial}>
        {!isInitial && hostBannerText ? (
          <HostModeBanner
            data-testid="host-mode-banner"
            $recovering={hostBannerRecovering}
          >
            {hostBannerText}
          </HostModeBanner>
        ) : null}

        {!isInitial ? (
          <MessagesScrollWrap>
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
          </MessagesScrollWrap>
        ) : (
          <InitialScrollAnchor ref={messagesAreaRef} aria-hidden />
        )}

        <ComposerFloat ref={composerRef} $initial={isInitial}>
          <ComposerWidthAlign>
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
          </ComposerWidthAlign>
        </ComposerFloat>
      </ChatViewport>
    </ChatSection>
  )
}

const ChatSection = styled.section<{ $initial?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${editorTheme.bg};
`

const ChatViewport = styled.div<{ $initial?: boolean }>`
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-left: ${editorLayout.mainPaddingX};
  padding-right: ${editorLayout.mainPaddingX};
  box-sizing: border-box;
  ${({ $initial }) =>
    $initial
      ? `
    justify-content: center;
    align-items: center;
  `
      : ''}
`

const ChatTopBar = styled.div`
  flex-shrink: 0;
  padding: 0.55rem ${editorLayout.mainPaddingX} 0.35rem;
  background: ${editorTheme.bg};
`

const ChatTopTitle = styled.h2`
  margin: 0;
  width: 100%;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${editorTheme.text};
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const InitialScrollAnchor = styled.div`
  display: none;
`

const MessagesScrollWrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  max-width: ${editorLayout.contentMaxWidth};
  margin: 0 auto;
  box-sizing: border-box;
`

const HostModeBanner = styled.div<{ $recovering?: boolean }>`
  flex-shrink: 0;
  margin: 0 auto 0.35rem;
  max-width: ${editorLayout.contentMaxWidth};
  width: calc(100% - 2 * ${editorLayout.mainPaddingX});
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  background: ${({ $recovering }) =>
    $recovering ? 'rgba(255, 196, 0, 0.12)' : editorTheme.accentSoft};
  border: 1px solid ${({ $recovering }) =>
    $recovering ? 'rgba(255, 196, 0, 0.35)' : 'rgba(233, 181, 11, 0.28)'};
  color: ${({ $recovering }) => ($recovering ? palette.bannerRecovering : palette.bannerHost)};
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  z-index: 2;
`

/** 与 MessagesInner 同宽：外层仅负责与消息区一致的水平留白 */
const ComposerWidthAlign = styled.div`
  width: 100%;
  max-width: ${editorLayout.contentMaxWidth};
  margin: 0 auto;
  box-sizing: border-box;
`

const ComposerFloat = styled.div<{ $initial?: boolean }>`
  z-index: 12;
  width: 100%;
  max-width: ${editorLayout.contentMaxWidth};
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
  padding: ${({ $initial }) =>
    $initial ? `0 ${editorLayout.mainPaddingX}` : `0 0 0.65rem`};
  pointer-events: none;

  ${({ $initial }) =>
    $initial
      ? `
    position: relative;
    flex-shrink: 0;
    background: transparent;
  `
      : `
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0 auto;
    background: linear-gradient(
      to top,
      ${editorTheme.bg} 12%,
      rgba(232, 232, 232, 0.94) 42%,
      rgba(232, 232, 232, 0) 100%
    );
  `}

  & > * {
    pointer-events: auto;
  }
`
