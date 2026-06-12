import styled from 'styled-components'
import type { AgentTodoItem } from '../../../types/agent'
import { editorTheme } from '../../../styles/editorTheme'
import { textStyle } from '../../../styles/typography'
import { formatTodoProgress } from '../../../utils/todoDisplay'
import { EditorButton } from '../../ui/EditorButton'
import {
  EditorModalBody,
  EditorModalHeader,
  EditorModalOverlay,
  EditorModalPanel,
  useEditorModalEscape,
} from '../../editor/EditorModalShell'
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
  useEditorModalEscape(open, onClose)

  if (!open) {
    return null
  }

  return (
    <EditorModalOverlay
      role="presentation"
      data-testid="todo-detail-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <EditorModalPanel $size="todo" role="dialog" aria-modal="true" aria-labelledby="todo-modal-title">
        <EditorModalHeader>
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
        </EditorModalHeader>
        <TodoBody>
          <TimelineTodoList todos={todos} embedded />
        </TodoBody>
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

const TodoBody = styled(EditorModalBody)`
  padding: 0.85rem 1.15rem 1.1rem;

  @media (max-width: 767px) {
    padding: 0.75rem 0.9rem 1rem;
  }
`
