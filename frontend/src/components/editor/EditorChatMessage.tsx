import styled from 'styled-components'
import type {
  AgentAssistantStreamPhase,
  AgentChoiceOption,
  AgentInteractionPayload,
  AgentTodoItem,
  AskUserAnswers,
} from '../../types/agent'
import { normalizeToolName } from '../../utils/agentToolNames'
import type { EditorMessage } from '../../types/editor'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { AssistantStreamTimeline } from '../agent/AssistantStreamTimeline'
import { AssistantMessageAgentTrace } from '../agent/AssistantMessageAgentTrace'
import { AgentMarkdown } from '../agent/AgentMarkdown'
import { ShimmerScanText } from '../loaders/ShimmerScanText'
import { UserChatBubble } from '../chat/UserChatBubble'
import { AgentThinkPanel } from '../agent/AgentThinkPanel'
import { ChatMessageSurfaceBody } from '../agent/ChatMessageSurface'
import { MessageTodoPanel } from '../agent/timeline/MessageTodoPanel'
import { TimelineDeliveryBlock } from '../agent/timeline/TimelineDeliveryBlock'
import { TimelineBodyDivider } from '../agent/timeline/timelineStyles'
import { dedupeTodosById, sortTodosForDisplay } from '../../utils/todoDisplay'
import { ensureReplayTimeline, hasAgentTrace } from '../../utils/agentMessageReplay'
import { sanitizeAgentStreamError } from '../../utils/sanitizeAgentStreamError'
import { EditorIcons } from './icons'

export interface EditorChatMessageProps {
  message: EditorMessage
  isActiveStream: boolean
  isLoading: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange: (open: boolean) => void
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
  onEditUserMessage?: (content: string) => void
  marketingScrubPlaying?: boolean
  marketingPinOrchestration?: boolean
}

export function EditorChatMessage({
  message,
  isActiveStream,
  isLoading,
  thinkExpanded,
  onThinkExpandedChange,
  onSelectChoice,
  onSubmitInteraction,
  onEditUserMessage,
  marketingScrubPlaying = false,
  marketingPinOrchestration = false,
}: EditorChatMessageProps) {
  const phase: AgentAssistantStreamPhase =
    message.agentStreamPhase ?? (isActiveStream ? 'connecting' : 'completed')
  const hasChoiceSteps = Boolean(
    message.agentSteps?.some((s) => (s.choices?.length ?? 0) > 0),
  )
  const replayTimeline = ensureReplayTimeline(message)
  const hasTimeline = replayTimeline.length > 0
  const hasTrace = hasAgentTrace(message)
  const streamActive = marketingScrubPlaying
    ? Boolean(isActiveStream)
    : isActiveStream && isLoading
  const streamFinished = marketingScrubPlaying
    ? false
    : phase === 'completed' ||
      phase === 'error' ||
      phase === 'waiting' ||
      !isActiveStream ||
      !isLoading
  const showConnectingPlaceholder =
    streamActive &&
    !message.content?.trim() &&
    !hasTimeline &&
    !hasTrace &&
    phase === 'connecting' &&
    !message.agentAwaitingInteraction &&
    !(message.agentSteps?.some((s) => (s.choices?.length ?? 0) > 0))
  const showAgentTimeline =
    !showConnectingPlaceholder && (hasTimeline || hasTrace || streamActive)
  const timelineShowsContent = replayTimeline.some(
    (block) => block.kind === 'text' && block.content.trim().length > 0,
  )
  const showDeliveryBody =
    !timelineShowsContent && Boolean(message.content?.trim())
  const hasOrchestrationTrace = replayTimeline.some(
    (block) =>
      block.kind === 'transition' ||
      block.kind === 'reasoning' ||
      block.kind === 'think' ||
      block.kind === 'narration' ||
      block.kind === 'tool',
  )
  const showDeliveryDivider = showDeliveryBody && hasOrchestrationTrace
  const thinkText = message.agentThinkText ?? message.thinking

  if (message.role === 'user') {
    return (
      <MessageRow $role="user">
        <UserChatBubble
          content={message.content}
          onEdit={
            onEditUserMessage
              ? () => onEditUserMessage(message.content)
              : undefined
          }
        />
      </MessageRow>
    )
  }

  const todoItems: AgentTodoItem[] = (() => {
    const merged: AgentTodoItem[] = []
    if (message.agentTodos?.length) {
      merged.push(...message.agentTodos)
    }
    for (const s of message.agentSteps ?? []) {
      if (normalizeToolName(s.toolName) === 'TodoWrite' && s.todos?.length) {
        merged.push(...s.todos)
      }
    }
    return sortTodosForDisplay(dedupeTodosById(merged))
  })()

  const showMessageTodoPanel = todoItems.length > 0
  return (
    <MessageRow $role="assistant">
      <AssistantMessageBlock>
        {message.agentStreamError && phase === 'error' && (
          <StreamErrorBanner role="alert">
            {sanitizeAgentStreamError(message.agentStreamError)}
          </StreamErrorBanner>
        )}
        {showConnectingPlaceholder && (
          <AssistLoadingBlock aria-hidden>
            <ShimmerScanText active>正在准备创作…</ShimmerScanText>
          </AssistLoadingBlock>
        )}
        {showAgentTimeline ? (
          <AssistantStreamShell data-testid="assistant-stream-shell">
            <AssistantStreamTimeline
              timeline={replayTimeline}
              stepStates={message.agentSteps ?? []}
              streamLive={streamActive}
              streamFinished={streamFinished}
              messageKey={message.id}
              thinkExpanded={thinkExpanded}
              fallbackThinkText={thinkText}
              awaitingInteraction={Boolean(message.agentAwaitingInteraction)}
              onThinkExpandedChange={onThinkExpandedChange}
              onSelectChoice={onSelectChoice}
              onSubmitInteraction={onSubmitInteraction}
              pinOrchestrationOpen={marketingPinOrchestration}
            />
            {showDeliveryDivider ? (
              <TimelineBodyDivider data-testid="orchestration-body-divider" />
            ) : null}
            {showDeliveryBody ? (
              <TimelineDeliveryBlock
                text={message.content}
                streamLive={streamActive && !streamFinished}
              />
            ) : null}
          </AssistantStreamShell>
        ) : !showConnectingPlaceholder && hasChoiceSteps ? (
          <>
            {(thinkText?.trim() || (isActiveStream && isLoading && message.agentIsThinking)) ? (
              <ThinkPanelWrap>
                <AgentThinkPanel
                  text={thinkText ?? ''}
                  isThinking={Boolean(
                    isActiveStream && isLoading && (message.agentIsThinking || !thinkText?.trim()),
                  )}
                  expanded={thinkExpanded}
                  onExpandedChange={onThinkExpandedChange}
                  markdown={false}
                  showCursor={false}
                  autoCollapseWhenDone
                />
              </ThinkPanelWrap>
            ) : null}
            <AssistantMessageAgentTrace
              thinkText={undefined}
              stepStates={message.agentSteps}
              isStreaming={isActiveStream && isLoading}
              streamPhase={phase}
              isThinking={false}
              thinkExpanded={thinkExpanded}
              onThinkExpandedChange={onThinkExpandedChange}
              onSelectChoice={onSelectChoice}
              onSubmitInteraction={onSubmitInteraction}
            />
          </>
        ) : !showConnectingPlaceholder && message.content?.trim() ? (
          <ChatMarkdownBody>
            <AgentMarkdown text={message.content} variant="chat" />
          </ChatMarkdownBody>
        ) : null}
        {message.writing && (
          <WritingSection>
            <WritingLabel>
              <EditorIcons.Edit3 />
              <span>{message.writing.status === 'writing' ? '写作中...' : '写作完成'}</span>
            </WritingLabel>
            {message.writing.content && (
              <WritingContent>{message.writing.content}</WritingContent>
            )}
          </WritingSection>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolsSection>
            <ToolsSectionLabel>
              <EditorIcons.Settings />
              <span>工具调用</span>
            </ToolsSectionLabel>
            {message.toolCalls.map((tool, i) => (
              <ToolItem key={i}>
                <span className="status" />
                <span>{tool.name}</span>
                {tool.result && <span className="result">{tool.result}</span>}
              </ToolItem>
            ))}
          </ToolsSection>
        )}
        {message.skillCalls && message.skillCalls.length > 0 && (
          <ToolsSection>
            <ToolsSectionLabel>
              <EditorIcons.PenTool />
              <span>技能调用</span>
            </ToolsSectionLabel>
            <SkillWrap>
              {message.skillCalls.map((skill, i) => (
                <SkillItem key={i}>
                  <span className="status" />
                  <span>{skill.name}</span>
                </SkillItem>
              ))}
            </SkillWrap>
          </ToolsSection>
        )}
        {showMessageTodoPanel ? (
          <MessageTodoPanel todos={todoItems} streamLive={streamActive} />
        ) : null}
      </AssistantMessageBlock>
    </MessageRow>
  )
}

const MessageRow = styled.div<{ $role: 'user' | 'assistant' }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$role === 'user' ? 'flex-end' : 'flex-start'};
  width: 100%;
`

const ThinkPanelWrap = styled(ChatMessageSurfaceBody)`
  padding-bottom: 0.45rem;
`

const AssistantStreamShell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
`

const AssistantMessageBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 100%;
  font-size: 0.9rem;
  line-height: 1.7;
  color: ${editorTheme.text};
`

const StreamErrorBanner = styled.div`
  margin: 0 0 0.65rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.76rem;
  line-height: 1.45;
  color: ${palette.errorUser};
  background: ${palette.errorBg};
  border: 1px solid rgba(192, 57, 43, 0.25);
  border-radius: 8px;
`

const AssistLoadingBlock = styled(ChatMessageSurfaceBody)`
  display: flex;
  align-items: center;
  min-height: 1.75rem;
`

const ChatMarkdownBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  max-width: 100%;
  padding: 0.05rem 0 0.15rem;
`

const WritingSection = styled.div`
  background: ${palette.accentSoft};
  border-top: 1px solid ${palette.accentMuted};
  padding: 0.6rem 1rem;
`

const WritingLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${palette.accent};
  margin-bottom: 0.4rem;
  svg { width: 12px; height: 12px; }
`

const WritingContent = styled.div`
  font-size: 0.8rem;
  color: ${palette.text};
  line-height: 1.6;
  padding: 0.5rem 0.75rem;
  background: ${palette.surfaceGlass};
  border-radius: 8px;
  border: 1px solid ${palette.accentMuted};
`

const ToolsSection = styled.div`
  border-top: 1px solid ${palette.border};
  padding: 0.5rem 1rem;
`

const ToolsSectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${palette.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.4rem;
  svg { width: 12px; height: 12px; }
`

const ToolItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.3rem 0.5rem;
  font-size: 0.75rem;
  color: ${palette.textSecondary};
  background: ${palette.proseTableStripe};
  border-radius: 6px;
  margin-bottom: 0.25rem;
  &:last-child { margin-bottom: 0; }
  .status {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${palette.traceOk};
  }
  .result {
    color: ${palette.textMuted};
    margin-left: auto;
  }
`

const SkillWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const SkillItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0.25rem 0.6rem;
  font-size: 0.7rem;
  color: ${palette.textDim};
  background: ${palette.accentSoft};
  border-radius: 20px;
  margin-right: 0.35rem;
  margin-bottom: 0.35rem;
  .status {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${palette.traceOk};
  }
`
