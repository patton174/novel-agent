import { EditorButton } from '../ui/EditorButton'
import type { AgentStepState } from '../../types/agent'
import { stepStatusLabel } from '../../utils/agentLabels'
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
          <span>全局链路追踪</span>
          {runId ? <code className={GLOBAL_TRACE_RUN_ID}>#{runId.slice(-8)}</code> : null}
        </div>
        <div className={GLOBAL_TRACE_META}>
          {isStreaming ? (
            <span className={GLOBAL_TRACE_LIVE_BADGE}>
              {activeToolCount > 0 ? `${activeToolCount} 个工具执行中` : 'Agent 运行中'}
            </span>
          ) : (
            <span>{toolSteps.length} 步</span>
          )}
          <span className={globalTraceChevronClass(expanded)}>›</span>
        </div>
      </EditorButton>

      {expanded && (
        <ol className={GLOBAL_TRACE_STEP_LIST} data-testid="global-trace-list">
          {toolSteps.length === 0 && isStreaming ? (
            <li className={GLOBAL_TRACE_EMPTY_HINT}>等待工具事件…</li>
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
                <div className={GLOBAL_TRACE_STEP_META}>{stepStatusLabel(step.status)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
