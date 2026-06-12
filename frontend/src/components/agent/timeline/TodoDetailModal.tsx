import type { AgentTodoItem } from '../../../types/agent'
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
      <EditorModalPanel size="todo" role="dialog" aria-modal="true" aria-labelledby="todo-modal-title">
        <EditorModalHeader>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 id="todo-modal-title" className="m-0 text-sm font-semibold text-foreground">
                待办
              </h2>
              <span className="whitespace-nowrap text-[11px] font-normal text-muted-foreground">
                {formatTodoProgress(todos)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">共 {todos.length} 项任务</p>
          </div>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </EditorModalHeader>
        <EditorModalBody className="px-[1.15rem] pb-[1.1rem] pt-[0.85rem] max-md:px-[0.9rem] max-md:pb-4 max-md:pt-3">
          <TimelineTodoList todos={todos} embedded />
        </EditorModalBody>
      </EditorModalPanel>
    </EditorModalOverlay>
  )
}
