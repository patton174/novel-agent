import type { AgentTodoItem } from '../../../types/agent'
import { formatTodoProgress } from '../../../utils/todoDisplay'
import { AppModalShell } from '@/components/ui/AppModalShell'
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
  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="todo"
      testId="todo-detail-modal"
      header={
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="m-0 text-sm font-semibold text-foreground">待办</h2>
              <span className="whitespace-nowrap text-[11px] font-normal text-muted-foreground">
                {formatTodoProgress(todos)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">共 {todos.length} 项任务</p>
          </div>
        </div>
      }
      bodyClassName="px-0 pb-2"
    >
      <TimelineTodoList todos={todos} embedded />
    </AppModalShell>
  )
}
