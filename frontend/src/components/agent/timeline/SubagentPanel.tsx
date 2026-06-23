import { useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { deriveSubagentLiveLines } from '../../../utils/subagentActivity'
import { translateToolOutcome } from '../../../utils/orchestrationI18n'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { SubagentDetailModal } from './SubagentDetailModal'
import { TimelineToolRowShell } from './layout'
import { resolveToolVisualStatus, TimelineLeadIcon } from './TimelineLeadIcon'
import {
  CC_TOOL_ARGS,
  CC_TOOL_HEADLINE_BUTTON,
  CC_TOOL_NAME,
  subagentPanelRootClass,
  TOOL_OUTCOME_ERROR,
  TOOL_OUTCOME_SUCCESS,
  TOOL_TITLE_ROW,
} from '@/lib/timelineClasses'

const LIVE_MAX_LINES = 3

export function SubagentPanel({
  subagent,
  loading,
}: {
  subagent: AgentSubagentState
  loading: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const runActive = subagent.status === 'active' && loading
  const meta = deriveSubagentDisplayMeta(subagent, runActive)
  const toolStats = meta.toolStats
  const liveLines = deriveSubagentLiveLines(subagent, runActive)
  const liveText = liveLines.join('\n')
  const showLiveBody = runActive && liveText.trim().length > 0
  const bodyId = useId()
  const liveRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = liveRef.current
    if (!el || !showLiveBody) {
      return
    }
    el.scrollTop = el.scrollHeight
  }, [liveText, showLiveBody])

  const iconStatus = resolveToolVisualStatus({
    loading: runActive,
    error: subagent.status === 'failed',
    success: subagent.status === 'done' && !runActive,
  })

  const outcomeBadge = runActive
    ? null
    : subagent.status === 'failed'
      ? 'error'
      : subagent.status === 'done'
        ? 'success'
        : null

  const branchLine =
    meta.currentStep ??
    (runActive ? '子代理运行中…' : subagent.status === 'done' ? '子代理已完成' : null)

  const branchBody =
    branchLine || showLiveBody || meta.turnHint || toolStats ? (
      <>
        {branchLine ? <div>{branchLine}</div> : null}
        {meta.turnHint && runActive ? (
          <div className="text-[0.68rem] text-muted-foreground/80">{meta.turnHint}</div>
        ) : null}
        {!runActive && toolStats ? (
          <div className="text-[0.68rem] text-muted-foreground/80">{toolStats}</div>
        ) : null}
        {showLiveBody ? (
          <div
            id={bodyId}
            ref={liveRef}
            data-testid="subagent-live-body"
            className={cn(
              'overflow-y-auto scroll-smooth [mask-image:linear-gradient(180deg,transparent_0%,#000_18%,#000_100%)]',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:size-0',
            )}
            style={{
              maxHeight: `calc(0.82rem * 1.45 * ${LIVE_MAX_LINES})`,
            }}
          >
            {liveLines.map((line, index) => (
              <div
                key={`${index}:${line.slice(0, 24)}`}
                className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.74rem] leading-[1.45] text-[#475569]"
              >
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </>
    ) : undefined

  return (
    <>
      <div className={subagentPanelRootClass(runActive)} data-testid="subagent-panel">
        <TimelineToolRowShell
          testId="subagent-tool-row"
          leadIcon={<TimelineLeadIcon iconName="Agent" status={iconStatus} />}
          headline={
            <button
              type="button"
              className={CC_TOOL_HEADLINE_BUTTON}
              onClick={() => setModalOpen(true)}
              aria-expanded={showLiveBody}
              aria-controls={showLiveBody ? bodyId : undefined}
              data-testid="subagent-inline-row"
            >
              <div className={TOOL_TITLE_ROW}>
                <span className={CC_TOOL_NAME}>
                  {runActive ? (
                    <ShimmerScanText active>{meta.name}</ShimmerScanText>
                  ) : (
                    meta.name
                  )}
                </span>
                {!runActive && outcomeBadge ? (
                  <span className={CC_TOOL_ARGS}>
                    {' · '}
                    <span
                      className={
                        outcomeBadge === 'success'
                          ? TOOL_OUTCOME_SUCCESS
                          : TOOL_OUTCOME_ERROR
                      }
                    >
                      {translateToolOutcome(outcomeBadge)}
                    </span>
                  </span>
                ) : null}
              </div>
            </button>
          }
          branch={branchBody}
        />
      </div>

      <SubagentDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        subagent={subagent}
        loading={loading}
      />
    </>
  )
}
