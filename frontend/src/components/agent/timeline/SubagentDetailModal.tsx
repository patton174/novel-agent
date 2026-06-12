import { useLayoutEffect, useRef } from 'react'
import styled from 'styled-components'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { editorTheme } from '../../../styles/editorTheme'
import { palette, textStyle } from '../../../styles/theme'
import { EditorButton } from '../../ui/EditorButton'
import {
  EditorModalBody,
  EditorModalHeader,
  EditorModalOverlay,
  EditorModalPanel,
  useEditorModalEscape,
} from '../../editor/EditorModalShell'
import { SubagentTimelineContent } from './SubagentTimelineContent'
import { SubagentStatusChip } from './timelineStyles'

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
          <HeaderText>
            <TitleRow>
              <Title id="subagent-modal-title">{meta.name}</Title>
              <SubagentStatusChip $kind={meta.statusKind}>{meta.statusLabel}</SubagentStatusChip>
            </TitleRow>
            {meta.description ? <Subtitle>{meta.description}</Subtitle> : null}
            {runActive && meta.currentStep ? (
              <StepHint>
                当前步骤：
                <strong>{meta.currentStep}</strong>
                {meta.turnHint ? <span> · {meta.turnHint}</span> : null}
              </StepHint>
            ) : null}
            {!runActive && meta.toolStats ? (
              <StatsHint data-testid="subagent-modal-stats">{meta.toolStats}</StatsHint>
            ) : null}
          </HeaderText>
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

const HeaderText = styled.div`
  min-width: 0;
  flex: 1;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
`

const Title = styled.h2`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${editorTheme.text};
`

const Subtitle = styled.p`
  margin: 0.35rem 0 0;
  ${textStyle('uiSm')}
  color: ${editorTheme.textSecondary};
  line-height: 1.45;
  white-space: pre-wrap;
`

const StepHint = styled.p`
  margin: 0.35rem 0 0;
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};

  strong {
    color: ${palette.accentDeep};
    font-weight: 600;
  }
`

const StatsHint = styled.p`
  margin: 0.35rem 0 0;
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};
  line-height: 1.45;
`
