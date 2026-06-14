import { useEffect, useMemo, useState } from 'react'
import type { AgentTodoItem } from '../../../types/agent'
import { useEditorMobile } from '@/hooks/useMediaQuery'
import {
  formatTodoProgress,
  MESSAGE_TODO_MAX_VISIBLE,
  sliceTodosForDisplay,
  sortTodosForDisplay,
} from '../../../utils/todoDisplay'
import { TodoDetailModal } from './TodoDetailModal'
import { TimelineTodoList } from './TimelineTodoList'
import {
  MESSAGE_TODO_HEADER,
  MESSAGE_TODO_META,
  MESSAGE_TODO_MORE,
  MESSAGE_TODO_TITLE,
  MESSAGE_TODO_WRAP,
} from '@/lib/timelineClasses'

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
  const isMobile = useEditorMobile()
  const maxVisible = isMobile ? 2 : MESSAGE_TODO_MAX_VISIBLE
  const sorted = useMemo(() => sortTodosForDisplay(todos), [todos])
  const targetReveal = Math.min(maxVisible, sorted.length)
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
    maxVisible,
    revealCount,
  )

  if (!visible.length) {
    return null
  }

  const progress = formatTodoProgress(todos)
  const canOpenModal = todos.length > 0

  return (
    <>
      <div data-testid="message-todo-panel" className={MESSAGE_TODO_WRAP}>
        <button
          type="button"
          className={MESSAGE_TODO_HEADER}
          onClick={() => setModalOpen(true)}
          disabled={!canOpenModal}
          aria-expanded={modalOpen}
          aria-haspopup="dialog"
          data-testid="message-todo-header"
        >
          <span className={MESSAGE_TODO_TITLE}>待办</span>
          <span className={`${MESSAGE_TODO_META} msg-todo-meta`}>{progress}</span>
        </button>
        <TimelineTodoList todos={visible} embedded />
        {omitted > 0 ? (
          <button
            type="button"
            className={MESSAGE_TODO_MORE}
            onClick={() => setModalOpen(true)}
            aria-label={`还有 ${omitted} 项待办，点击查看全部`}
            data-testid="message-todo-more"
          >
            还有 {omitted} 项…
          </button>
        ) : null}
      </div>

      <TodoDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        todos={sorted}
      />
    </>
  )
}
