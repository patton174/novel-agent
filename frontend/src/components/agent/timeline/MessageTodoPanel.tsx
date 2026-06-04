import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import type { AgentTodoItem } from '../../../types/agent'
import { editorTheme } from '../../../styles/editorTheme'
import { palette, textStyle } from '../../../styles/theme'
import {
  formatTodoProgress,
  MESSAGE_TODO_MAX_VISIBLE,
  sliceTodosForDisplay,
  sortTodosForDisplay,
} from '../../../utils/todoDisplay'
import { TodoDetailModal } from './TodoDetailModal'
import { TimelineTodoList } from './TimelineTodoList'

const REVEAL_STEP_MS = 140

/** 助手消息底部的任务清单（最多 3 条，逐项展开，已完成排后） */
export function MessageTodoPanel({
  todos,
  streamLive = false,
}: {
  todos: AgentTodoItem[]
  streamLive?: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const sorted = useMemo(() => sortTodosForDisplay(todos), [todos])
  const targetReveal = Math.min(MESSAGE_TODO_MAX_VISIBLE, sorted.length)
  const [revealCount, setRevealCount] = useState(() =>
    streamLive ? 0 : targetReveal,
  )

  useEffect(() => {
    if (!streamLive) {
      setRevealCount(targetReveal)
      return
    }
    if (revealCount >= targetReveal) {
      return
    }
    const timer = window.setTimeout(
      () => setRevealCount((n) => Math.min(targetReveal, n + 1)),
      REVEAL_STEP_MS,
    )
    return () => window.clearTimeout(timer)
  }, [streamLive, targetReveal, revealCount])

  useEffect(() => {
    if (streamLive && sorted.length === 0) {
      setRevealCount(0)
    }
  }, [streamLive, sorted.length])

  const { visible, omitted } = sliceTodosForDisplay(
    sorted,
    MESSAGE_TODO_MAX_VISIBLE,
    revealCount,
  )

  if (!visible.length) {
    return null
  }

  const progress = formatTodoProgress(todos)
  const canOpenModal = todos.length > 0

  return (
    <>
      <Wrap data-testid="message-todo-panel">
        <HeaderButton
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={!canOpenModal}
          aria-expanded={modalOpen}
          aria-haspopup="dialog"
          data-testid="message-todo-header"
        >
          <Title>待办</Title>
          <Meta>{progress}</Meta>
        </HeaderButton>
        <TimelineTodoList todos={visible} embedded />
        {omitted > 0 ? (
          <OmittedButton
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={`还有 ${omitted} 项待办，点击查看全部`}
            data-testid="message-todo-more"
          >
            还有 {omitted} 项…
          </OmittedButton>
        ) : null}
      </Wrap>

      <TodoDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        todos={sorted}
      />
    </>
  )
}

const Wrap = styled.div`
  width: 100%;
  margin: 0.35rem 0 0;
  padding: 0;
`

const Title = styled.span`
  ${textStyle('uiSm')}
  font-weight: 600;
  color: ${editorTheme.text};
`

const Meta = styled.span`
  ${textStyle('micro')}
  font-weight: 400;
  color: ${editorTheme.textMuted};
  white-space: nowrap;
`

const HeaderButton = styled.button`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  width: 100%;
  margin: 0 0 0.2rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:hover:not(:disabled) ${Title} {
    color: ${editorTheme.text};
  }

  &:hover:not(:disabled) ${Meta} {
    color: ${editorTheme.textSecondary};
  }

  &:focus-visible {
    outline: 2px solid ${palette.accentBorder};
    outline-offset: 2px;
    border-radius: 4px;
  }

  &:disabled {
    cursor: default;
  }
`

const OmittedButton = styled.button`
  ${textStyle('micro')}
  margin-top: 0.15rem;
  padding: 0;
  border: none;
  background: transparent;
  color: ${editorTheme.textMuted};
  cursor: pointer;
  text-align: left;

  &:hover {
    color: ${editorTheme.textSecondary};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${palette.accentBorder};
    outline-offset: 2px;
    border-radius: 4px;
  }
`
