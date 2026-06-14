import { memo, useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type {
  AgentAssistantStreamPhase,
  AgentChoiceOption,
  AgentInteractionPayload,
  AgentTodoItem,
  AskUserAnswers,
} from '../../types/agent'
import { normalizeToolName } from '../../utils/agentToolNames'
import type { EditorMessage } from '../../types/editor'
import { AssistantStreamTimeline } from '../agent/AssistantStreamTimeline'
import { AssistantMessageAgentTrace } from '../agent/AssistantMessageAgentTrace'
import { AgentMarkdown } from '../agent/AgentMarkdown'
import { ShimmerScanText } from '../loaders/ShimmerScanText'
import { UserChatBubble } from '../chat/UserChatBubble'
import { AgentThinkPanel } from '../agent/AgentThinkPanel'
import { ChatMessageSurfaceBody } from '../agent/ChatMessageSurface'
import { MessageTodoPanel } from '../agent/timeline/MessageTodoPanel'
import { TimelineDeliveryBlock } from '../agent/timeline/TimelineDeliveryBlock'
import { TIMELINE_BODY_DIVIDER, MOBILE_PROCESS_TOGGLE } from '@/lib/timelineClasses'
import { dedupeTodosById, sortTodosForDisplay } from '../../utils/todoDisplay'
import { ensureReplayTimeline, hasAgentTrace } from '../../utils/agentMessageReplay'
import {
  countOrchestrationSteps,
  extractAssistantDeliveryText,
} from '../../utils/agentMessageMobileSummary'
import { sanitizeAgentStreamError } from '../../utils/sanitizeAgentStreamError'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { EditorIcons } from './icons'

import { useTranslation } from 'react-i18next'

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

function EditorChatMessageInner({
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
  const { t } = useTranslation(['editor'])
  const phase: AgentAssistantStreamPhase =
    message.agentStreamPhase ?? (isActiveStream ? 'connecting' : 'completed')
  const hasChoiceSteps = Boolean(message.agentSteps?.some((s) => (s.choices?.length ?? 0) > 0))
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
    !message.agentSteps?.some((s) => (s.choices?.length ?? 0) > 0)
  const showAgentTimeline =
    !showConnectingPlaceholder && (hasTimeline || hasTrace || streamActive)
  const timelineShowsContent = replayTimeline.some(
    (block) => block.kind === 'text' && block.content.trim().length > 0,
  )
  const showDeliveryBody = !timelineShowsContent && Boolean(message.content?.trim())
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
  const isMobile = useAppMobile()
  const [processExpanded, setProcessExpanded] = useState(false)

  const deliveryText = useMemo(
    () => extractAssistantDeliveryText(message, replayTimeline),
    [message, replayTimeline],
  )
  const orchestrationStepCount = useMemo(
    () => countOrchestrationSteps(message.agentSteps, replayTimeline),
    [message.agentSteps, replayTimeline],
  )
  const canCollapseProcess =
    isMobile &&
    !message.agentAwaitingInteraction &&
    hasOrchestrationTrace &&
    orchestrationStepCount > 0

  const processCollapsed = canCollapseProcess && !processExpanded
  const showProcessToggle = canCollapseProcess && (streamFinished || streamActive)

  useEffect(() => {
    setProcessExpanded(false)
  }, [message.id])

  const showFullTimeline = showAgentTimeline && !processCollapsed

  if (message.role === 'user') {
    return (
      <div className="flex w-full flex-col items-end">
        <UserChatBubble
          content={message.content}
          onEdit={
            onEditUserMessage ? () => onEditUserMessage(message.content) : undefined
          }
        />
      </div>
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
    <div className="flex w-full flex-col items-start">
      <div className="flex w-full max-w-full flex-col gap-2 text-[15px] leading-relaxed text-foreground">
        {message.agentStreamError && phase === 'error' && (
          <div
            className="mb-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-2.5 py-2 text-xs leading-snug text-destructive"
            role="alert"
          >
            {sanitizeAgentStreamError(message.agentStreamError)}
          </div>
        )}
        {showConnectingPlaceholder && (
          <ChatMessageSurfaceBody className="flex min-h-7 items-center" aria-hidden>
            <ShimmerScanText active>{t('editor:chat.preparing')}</ShimmerScanText>
          </ChatMessageSurfaceBody>
        )}
        {showAgentTimeline ? (
          <div className="flex w-full max-w-full flex-col" data-testid="assistant-stream-shell">
            {processCollapsed && streamActive && !deliveryText ? (
              <ChatMessageSurfaceBody className="flex min-h-7 items-center py-1" aria-live="polite">
                <ShimmerScanText active>{t('editor:chat.creating')}</ShimmerScanText>
              </ChatMessageSurfaceBody>
            ) : null}
            {processCollapsed && deliveryText ? (
              <TimelineDeliveryBlock
                text={deliveryText}
                streamLive={false}
                testId="assistant-delivery-collapsed"
              />
            ) : null}
            {showProcessToggle ? (
              <button
                type="button"
                className={MOBILE_PROCESS_TOGGLE}
                aria-expanded={processExpanded}
                aria-label={
                  processExpanded
                    ? t('editor:chat.collapseProcess')
                    : t('editor:chat.expandProcessCount', { count: orchestrationStepCount })
                }
                onClick={() => setProcessExpanded((open) => !open)}
                data-testid="mobile-process-toggle"
              >
                <span>
                  {processExpanded
                    ? t('editor:chat.collapseProcess')
                    : streamActive
                      ? t('editor:chat.processCreatingCount', { count: orchestrationStepCount })
                      : processCollapsed && !deliveryText
                        ? t('editor:chat.processExpandCount', { count: orchestrationStepCount })
                        : t('editor:chat.processViewCount', { count: orchestrationStepCount })}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 transition-transform ${processExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            ) : null}
            {showFullTimeline ? (
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
            ) : null}
            {showFullTimeline && showDeliveryDivider ? (
              <div
                className={TIMELINE_BODY_DIVIDER}
                data-testid="orchestration-body-divider"
              />
            ) : null}
            {showFullTimeline && showDeliveryBody ? (
              <TimelineDeliveryBlock
                text={message.content}
                streamLive={streamActive && !streamFinished}
              />
            ) : null}
          </div>
        ) : !showConnectingPlaceholder && hasChoiceSteps ? (
          <>
            {(thinkText?.trim() || (isActiveStream && isLoading && message.agentIsThinking)) ? (
              <ChatMessageSurfaceBody className="pb-2">
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
              </ChatMessageSurfaceBody>
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
          <div className="flex w-full max-w-full flex-col gap-1.5 px-0 py-0.5">
            <AgentMarkdown text={message.content} variant="chat" />
          </div>
        ) : null}
        {message.writing && (
          <div className="border-t border-primary/10 bg-primary/5 px-4 py-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-ui-sm font-semibold text-primary [&_svg]:size-3">
              <EditorIcons.Edit3 />
              <span>{message.writing.status === 'writing' ? t('editor:chat.writing') : t('editor:chat.writingDone')}</span>
            </div>
            {message.writing.content && (
              <div className="rounded-lg border border-primary/10 bg-background/80 px-3 py-2 text-ui leading-relaxed text-foreground">
                {message.writing.content}
              </div>
            )}
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-ui-sm font-semibold uppercase tracking-wide text-muted-foreground [&_svg]:size-3">
              <EditorIcons.Settings />
              <span>{t('editor:chat.toolCall')}</span>
            </div>
            {message.toolCalls.map((tool, i) => (
              <div
                key={i}
                className="mb-1 flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground last:mb-0"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{tool.name}</span>
                {tool.result ? (
                  <span className="ml-auto text-muted-foreground/80">{tool.result}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {message.skillCalls && message.skillCalls.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-ui-sm font-semibold uppercase tracking-wide text-muted-foreground [&_svg]:size-3">
              <EditorIcons.PenTool />
              <span>{t('editor:chat.skillCall')}</span>
            </div>
            <div className="flex flex-wrap">
              {message.skillCalls.map((skill, i) => (
                <div
                  key={i}
                  className="mb-1.5 mr-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-ui-sm text-muted-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{skill.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {showMessageTodoPanel ? (
          <MessageTodoPanel todos={todoItems} streamLive={streamActive} />
        ) : null}
      </div>
    </div>
  )
}

function areMessagesEqual(prev: EditorChatMessageProps, next: EditorChatMessageProps): boolean {
  if (prev.message.id !== next.message.id) return false
  if (prev.isActiveStream !== next.isActiveStream) return false
  if (prev.isLoading !== next.isLoading) return false
  if (prev.thinkExpanded !== next.thinkExpanded) return false
  if (prev.marketingScrubPlaying !== next.marketingScrubPlaying) return false
  if (prev.marketingPinOrchestration !== next.marketingPinOrchestration) return false
  if (prev.onThinkExpandedChange !== next.onThinkExpandedChange) return false
  if (prev.onSelectChoice !== next.onSelectChoice) return false
  if (prev.onSubmitInteraction !== next.onSubmitInteraction) return false
  if (prev.onEditUserMessage !== next.onEditUserMessage) return false

  const prevMsg = prev.message
  const nextMsg = next.message
  if (prevMsg.role !== nextMsg.role) return false
  if (prevMsg.content.length !== nextMsg.content.length) return false
  if ((prevMsg.agentThinkText?.length ?? 0) !== (nextMsg.agentThinkText?.length ?? 0)) return false
  if ((prevMsg.thinking?.length ?? 0) !== (nextMsg.thinking?.length ?? 0)) return false
  if ((prevMsg.agentSteps?.length ?? 0) !== (nextMsg.agentSteps?.length ?? 0)) return false
  if ((prevMsg.agentTimeline?.length ?? 0) !== (nextMsg.agentTimeline?.length ?? 0)) return false
  if ((prevMsg.agentTodos?.length ?? 0) !== (nextMsg.agentTodos?.length ?? 0)) return false
  if ((prevMsg.toolCalls?.length ?? 0) !== (nextMsg.toolCalls?.length ?? 0)) return false
  if ((prevMsg.skillCalls?.length ?? 0) !== (nextMsg.skillCalls?.length ?? 0)) return false
  if (prevMsg.agentStreamPhase !== nextMsg.agentStreamPhase) return false
  if (prevMsg.agentIsThinking !== nextMsg.agentIsThinking) return false
  if (prevMsg.agentAwaitingInteraction !== nextMsg.agentAwaitingInteraction) return false
  if (prevMsg.agentStreamError !== nextMsg.agentStreamError) return false
  if (prevMsg.agentStreamPaused !== nextMsg.agentStreamPaused) return false
  if (prevMsg.agentActiveToolCount !== nextMsg.agentActiveToolCount) return false
  if (prevMsg.agentHostGuardMessage !== nextMsg.agentHostGuardMessage) return false
  if (prevMsg.agentRunId !== nextMsg.agentRunId) return false

  const prevWriting = prevMsg.writing
  const nextWriting = nextMsg.writing
  if (Boolean(prevWriting) !== Boolean(nextWriting)) return false
  if (prevWriting && nextWriting) {
    if (prevWriting.status !== nextWriting.status) return false
    if (prevWriting.content.length !== nextWriting.content.length) return false
  }

  return true
}

export const EditorChatMessage = memo(EditorChatMessageInner, areMessagesEqual)
