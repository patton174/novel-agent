import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { deriveSubagentLiveLines } from '../../../utils/subagentActivity'
import { SubagentDetailModal } from './SubagentDetailModal'
import { CcToolRow } from './CcToolRow'
import { resolveToolVisualStatus } from './TimelineLeadIcon'
import { subagentPanelRootClass } from '@/lib/timelineClasses'

const LIVE_MAX_LINES = 3

export function SubagentPanel({
  subagent,
  loading,
}: {
  subagent: AgentSubagentState
  loading: boolean
}) {
  const { t } = useTranslation('editor')
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

  const inlineResult = runActive
    ? meta.currentStep ?? meta.turnHint ?? t('agent.timeline.subagentRunning')
    : toolStats

  const liveBranch = showLiveBody ? (
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
          className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.74rem] leading-[1.45] text-muted-foreground"
        >
          {line}
        </div>
      ))}
    </div>
  ) : undefined

  return (
    <>
      <div
        className={subagentPanelRootClass(runActive)}
        data-testid="subagent-panel"
        data-subagent-child-run={subagent.childRunId}
      >
        <CcToolRow
          testId="subagent-inline-row"
          name={meta.name}
          phaseActive={runActive}
          outcomeBadge={outcomeBadge}
          inlineResult={inlineResult}
          iconName="Agent"
          iconStatus={iconStatus}
          branch={liveBranch}
          headlineOnClick={() => setModalOpen(true)}
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
