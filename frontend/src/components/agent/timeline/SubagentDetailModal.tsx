import { useLayoutEffect, useRef } from 'react'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { EditorButton } from '../../ui/EditorButton'
import {
  EditorModalBody,
  EditorModalHeader,
  EditorModalOverlay,
  EditorModalPanel,
  useEditorModalEscape,
} from '../../editor/EditorModalShell'
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

  useEditorModalEscape(open, onClose)

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
    subagent.turn,
  ])

  if (!open) {
    return null
  }

  return (
    <EditorModalOverlay
      role="presentation"
      data-testid="subagent-detail-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <EditorModalPanel
        size="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subagent-modal-title"
      >
        <EditorModalHeader>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="subagent-modal-title" className="m-0 text-[15px] font-bold text-foreground">
                {meta.name}
              </h2>
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
            {!runActive && meta.toolStats ? (
              <p
                className="mt-1.5 text-[11px] leading-snug text-muted-foreground"
                data-testid="subagent-modal-stats"
              >
                {meta.toolStats}
              </p>
            ) : null}
          </div>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </EditorModalHeader>
        <EditorModalBody
          ref={bodyRef}
          className="scroll-smooth px-[1.15rem] pb-[1.15rem] pt-3 max-md:px-[0.9rem] max-md:pb-4 max-md:pt-2.5"
        >
          <SubagentTimelineContent subagent={subagent} loading={loading} />
        </EditorModalBody>
      </EditorModalPanel>
    </EditorModalOverlay>
  )
}
