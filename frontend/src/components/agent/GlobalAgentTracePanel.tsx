import { useTranslation } from 'react-i18next'
import { EditorButton } from '../ui/EditorButton'
import type { AgentStepState } from '../../types/agent'
import {
  GLOBAL_TRACE_EMPTY_HINT,
  GLOBAL_TRACE_LIVE_BADGE,
  GLOBAL_TRACE_META,
  GLOBAL_TRACE_PANEL,
  GLOBAL_TRACE_RUN_ID,
  GLOBAL_TRACE_STEP_LIST,
  GLOBAL_TRACE_STEP_MAIN,
  GLOBAL_TRACE_STEP_META,
  GLOBAL_TRACE_STEP_ROW,
  GLOBAL_TRACE_STEP_TITLE,
  GLOBAL_TRACE_TITLE_ROW,
  agentTraceStatusDotClass,
  globalTraceChevronClass,
  globalTracePulseDotClass,
} from '@/lib/agentTraceClasses'

export interface GlobalAgentTracePanelProps {
  runId?: string
  steps: AgentStepState[]
  activeToolCount: number
  isStreaming: boolean
  expanded: boolean
  onToggle: () => void
}

export function GlobalAgentTracePanel({
  runId,
  steps,
  activeToolCount,
  isStreaming,
  expanded,
  onToggle,
}: GlobalAgentTracePanelProps) {
  const { t } = useTranslation('editor')
  if (!isStreaming && steps.length === 0) {
    return null
  }

  const toolSteps = steps.filter((s) => s.type === 'tool')

  return (
    <div className={GLOBAL_TRACE_PANEL} data-testid="global-agent-trace">
      <EditorButton
        variant="panel"
        fullWidth
        type="button"
        onClick={onToggle}
        data-testid="global-trace-toggle"
      >
        <div className={GLOBAL_TRACE_TITLE_ROW}>
          <span className={globalTracePulseDotClass(isStreaming)} />
          <span>{t('agent.timeline.globalTraceTitle')}</span>
          {runId ? <code className={GLOBAL_TRACE_RUN_ID}>#{runId.slice(-8)}</code> : null}
        </div>
        <div className={GLOBAL_TRACE_META}>
          {isStreaming ? (
            <span className={GLOBAL_TRACE_LIVE_BADGE}>
              {activeToolCount > 0
                ? t('agent.timeline.toolsRunning', { count: activeToolCount })
                : t('agent.timeline.agentRunning')}
            </span>
          ) : (
            <span>{t('agent.timeline.stepCount', { count: toolSteps.length })}</span>
          )}
          <span className={globalTraceChevronClass(expanded)}>›</span>
        </div>
      </EditorButton>

      {expanded && (
        <ol className={GLOBAL_TRACE_STEP_LIST} data-testid="global-trace-list">
          {toolSteps.length === 0 && isStreaming ? (
            <li className={GLOBAL_TRACE_EMPTY_HINT}>{t('agent.timeline.waitingToolEvents')}</li>
          ) : null}
          {toolSteps.map((step) => (
            <li key={step.stepId} className={GLOBAL_TRACE_STEP_ROW} data-status={step.status}>
              <span
                className={agentTraceStatusDotClass({
                  failed: step.status === 'failed',
                  active: step.status === 'started',
                })}
              />
              <div className={GLOBAL_TRACE_STEP_MAIN}>
                <div className={GLOBAL_TRACE_STEP_TITLE}>{step.title}</div>
                <div className={GLOBAL_TRACE_STEP_META}>
                  {step.status === 'failed' ? t('agent.timeline.phaseFailed') : ''}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
