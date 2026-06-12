import { useEffect, useLayoutEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import type { AgentSubagentState } from '../../../types/agent'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { editorModalSurface } from '../../../styles/editorModal'
import { editorTheme } from '../../../styles/editorTheme'
import { palette, textStyle } from '../../../styles/theme'
import { EditorButton } from '../../ui/EditorButton'
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

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <Overlay
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      data-testid="subagent-detail-modal"
    >
      <Dialog role="dialog" aria-modal="true" aria-labelledby="subagent-modal-title">
        <DialogHeader>
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
        </DialogHeader>
        <DialogBody ref={bodyRef}>
          <SubagentTimelineContent subagent={subagent} loading={loading} />
        </DialogBody>
      </Dialog>
    </Overlay>
  )
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: ${editorModalSurface.overlay};
  backdrop-filter: ${editorModalSurface.overlayBlur};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  animation: ${fadeIn} 0.18s ease both;

  @media (max-width: 767px) {
    padding: 0;
    align-items: stretch;
  }
`

const Dialog = styled.div`
  width: min(720px, 100%);
  max-height: min(82vh, 760px);
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: ${editorModalSurface.dialogBg};
  box-shadow: ${editorModalSurface.dialogShadow};
  overflow: hidden;
  animation: ${slideUp} 0.22s ease both;

  @media (max-width: 767px) {
    width: 100%;
    max-height: none;
    height: 100%;
    border-radius: 0;
    animation: ${fadeIn} 0.18s ease both;
  }
`

const DialogHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem 0.85rem;
  border-bottom: 1px solid ${editorTheme.border};

  @media (max-width: 767px) {
    padding: 0.85rem 0.9rem 0.75rem;
    gap: 0.65rem;
  }
`

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

const DialogBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 1.15rem 1.15rem;
  scroll-behavior: smooth;

  @media (max-width: 767px) {
    padding: 0.65rem 0.9rem 1rem;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${palette.scrollbarThumb};
    border-radius: 4px;
  }
`
