import { useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import type { AgentTodoItem } from '../../../types/agent'
import { editorModalSurface } from '../../../styles/editorModal'
import { editorTheme } from '../../../styles/editorTheme'
import { textStyle } from '../../../styles/typography'
import { formatTodoProgress } from '../../../utils/todoDisplay'
import { EditorButton } from '../../ui/EditorButton'
import { TimelineTodoList } from './TimelineTodoList'

export function TodoDetailModal({
  open,
  onClose,
  todos,
}: {
  open: boolean
  onClose: () => void
  todos: AgentTodoItem[]
}) {
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
      data-testid="todo-detail-modal"
    >
      <Dialog role="dialog" aria-modal="true" aria-labelledby="todo-modal-title">
        <DialogHeader>
          <HeaderText>
            <TitleRow>
              <Title id="todo-modal-title">待办</Title>
              <Progress>{formatTodoProgress(todos)}</Progress>
            </TitleRow>
            <Subtitle>共 {todos.length} 项任务</Subtitle>
          </HeaderText>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </DialogHeader>
        <DialogBody>
          <TimelineTodoList todos={todos} embedded />
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
  width: min(520px, 100%);
  max-height: min(78vh, 640px);
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
  }
`

const HeaderText = styled.div`
  min-width: 0;
  flex: 1;
`

const TitleRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
`

const Title = styled.h2`
  margin: 0;
  ${textStyle('uiSm')}
  font-weight: 600;
  color: ${editorTheme.text};
`

const Progress = styled.span`
  ${textStyle('micro')}
  font-weight: 400;
  color: ${editorTheme.textMuted};
  white-space: nowrap;
`

const Subtitle = styled.p`
  margin: 0.28rem 0 0;
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};
`

const DialogBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.85rem 1.15rem 1.1rem;

  @media (max-width: 767px) {
    padding: 0.75rem 0.9rem 1rem;
  }
`
