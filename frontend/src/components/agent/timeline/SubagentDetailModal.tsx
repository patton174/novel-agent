import { useLayoutEffect, useRef } from 'react'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_ORCH_STATUS_LINE } from '@/lib/editorPixelClasses'
import { SubagentTimelineContent } from './SubagentTimelineContent'
import { subagentStatusChipClass } from '@/lib/timelineClasses'

export function SubagentDetailModal({
  open,
  onClose,
  subagent,
  loading,
}: {
  open: boolean
  onClose: () => void
  subagent: AgentSubagentState
  loading: boolean
}) {
  const runActive = subagent.status === 'active' && loading
  const meta = deriveSubagentDisplayMeta(subagent, runActive)
  const bodyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !runActive) {
      return
    }
    const el = bodyRef.current
    if (!el) {
      return
    }
    el.scrollTop = el.scrollHeight
  }, [
    open,
    runActive,
    subagent.logs.length,
    subagent.thinkText,
    subagent.summaryPreview,
    subagent.timeline?.length,
    subagent.turn,
  ])

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="detail"
      testId="subagent-detail-modal"
      header={
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className={cn('m-0', EDITOR_PIXEL_ORCH_STATUS_LINE, 'text-foreground normal-case')}>
                {meta.name}
              </DialogTitle>
              <span className={subagentStatusChipClass(meta.statusKind)}>
                {meta.statusLabel}
              </span>
            </div>
            {meta.description ? (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-snug text-muted-foreground">
                {meta.description}
              </p>
            ) : null}
            {runActive && meta.currentStep ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                当前步骤：
                <strong className="font-semibold text-primary">{meta.currentStep}</strong>
                {meta.turnHint ? <span> · {meta.turnHint}</span> : null}
              </p>
            ) : null}
          </div>
        </div>
      }
      bodyClassName="overflow-hidden p-0"
    >
      <div
        ref={bodyRef}
        className="max-h-[min(58vh,520px)] overflow-y-auto scroll-smooth px-1 pb-2 pt-1 max-md:max-h-none max-md:flex-1"
      >
        <SubagentTimelineContent subagent={subagent} loading={loading} />
      </div>
    </AppModalShell>
  )
}
