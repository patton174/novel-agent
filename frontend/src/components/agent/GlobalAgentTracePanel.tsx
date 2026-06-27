import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorButton } from '../ui/EditorButton'
import type { AgentStepState } from '../../types/agent'
import type { RunTreeNode } from '@/types/agentProfile'
import { fetchRunTree } from '@/api/agentProfileApi'
import { AgentRunTree } from './AgentRunTree'
import { useAppMobile } from '@/hooks/useMediaQuery'
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
  onSelectRunNode?: (node: RunTreeNode) => void
}

export function GlobalAgentTracePanel({
  runId,
  steps,
  activeToolCount,
  isStreaming,
  expanded,
  onToggle,
  onSelectRunNode,
}: GlobalAgentTracePanelProps) {
  const { t } = useTranslation('editor')
  const isMobile = useAppMobile()
  const [runTree, setRunTree] = useState<RunTreeNode | null>(null)
  const [runTreeLoading, setRunTreeLoading] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [showRunTree, setShowRunTree] = useState(!isMobile)

  useEffect(() => {
    if (!runId || isStreaming) {
      setRunTree(null)
      return
    }
    let cancelled = false
    setRunTreeLoading(true)
    void fetchRunTree(runId)
      .then((tree) => {
        if (!cancelled) setRunTree(tree)
      })
      .catch(() => {
        if (!cancelled) setRunTree(null)
      })
      .finally(() => {
        if (!cancelled) setRunTreeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [runId, isStreaming])

  if (!isStreaming && steps.length === 0 && !runId) {
    return null
  }

  const toolSteps = steps.filter((s) => s.type === 'tool')
  const runComplete = Boolean(runId) && !isStreaming
  const hasRunTree = runComplete && (runTreeLoading || Boolean(runTree?.runId))

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
          {hasRunTree && isMobile ? (
            <span
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded px-1.5 py-0.5 text-[0.68rem] font-medium text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation()
                setShowRunTree((v) => !v)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowRunTree((v) => !v)
                }
              }}
            >
              {showRunTree ? t('editor:runTree.hide') : t('editor:runTree.show')}
            </span>
          ) : null}
          <span className={globalTraceChevronClass(expanded)}>›</span>
        </div>
      </EditorButton>

      {expanded && (
        <>
          {hasRunTree && showRunTree ? (
            <AgentRunTree
              root={runTree}
              loading={runTreeLoading}
              selectedRunId={selectedRunId}
              onSelectNode={(node) => {
                setSelectedRunId(node.runId)
                onSelectRunNode?.(node)
              }}
            />
          ) : null}
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
        </>
      )}
    </div>
  )
}
