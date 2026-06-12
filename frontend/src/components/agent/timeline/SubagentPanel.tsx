import { useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { deriveSubagentLiveLines } from '../../../utils/subagentActivity'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { SubagentDetailModal } from './SubagentDetailModal'
import { resolveToolVisualStatus, TimelineLeadIcon } from './TimelineLeadIcon'
import {
  CC_BRANCH_CONTENT,
  CC_BRANCH_GLYPH,
  CC_TOOL_ARGS,
  CC_TOOL_HEADLINE,
  CC_TOOL_HEADLINE_BUTTON,
  CC_TOOL_HEADLINE_ROW,
  CC_TOOL_MAIN,
  CC_TOOL_NAME,
  CC_TOOL_ROW_WRAP,
  HEADLINE_CLUSTER,
  SUBAGENT_PANEL_ROOT,
  ccToolBranchClass,
  toolLeadCellClass,
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

  const phaseLabel = runActive ? '运行中' : meta.statusLabel
  const iconStatus = resolveToolVisualStatus({
    loading: runActive,
    error: subagent.status === 'failed',
    success: subagent.status === 'done' && !runActive,
  })

  return (
    <>
      <div className={SUBAGENT_PANEL_ROOT} data-testid="subagent-panel">
        <div className={CC_TOOL_ROW_WRAP}>
          <div className={CC_TOOL_HEADLINE_ROW}>
            <div className={toolLeadCellClass()}>
              <TimelineLeadIcon iconName="Agent" status={iconStatus} />
            </div>
            <div className={CC_TOOL_MAIN}>
              <button
                type="button"
                className={CC_TOOL_HEADLINE_BUTTON}
                onClick={() => setModalOpen(true)}
                aria-expanded={showLiveBody}
                aria-controls={showLiveBody ? bodyId : undefined}
                data-testid="subagent-inline-row"
              >
                <div className={CC_TOOL_HEADLINE}>
                  <span className={HEADLINE_CLUSTER}>
                    <span className={CC_TOOL_NAME}>{meta.name}</span>
                    <span className={CC_TOOL_ARGS}>
                      {runActive ? (
                        <ShimmerScanText active>{phaseLabel}</ShimmerScanText>
                      ) : (
                        phaseLabel
                      )}
                      {meta.turnHint ? ` · ${meta.turnHint}` : ''}
                      {toolStats ? (
                        <>
                          {' · '}
                          <span className="text-[0.68rem] font-normal whitespace-nowrap text-[#64748b]">
                            {toolStats}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </span>
                </div>
              </button>
            </div>
          </div>

          {showLiveBody ? (
            <div className={ccToolBranchClass()}>
              <span className={CC_BRANCH_GLYPH} aria-hidden />
              <div className={CC_BRANCH_CONTENT}>
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
                      {index === liveLines.length - 1 && runActive ? (
                        <ShimmerScanText active>{line}</ShimmerScanText>
                      ) : (
                        line
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
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
