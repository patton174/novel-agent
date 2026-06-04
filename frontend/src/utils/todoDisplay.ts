import type { AgentTodoItem, AgentTodoStatus } from '../types/agent'

const STATUS_RANK: Record<AgentTodoStatus, number> = {
  in_progress: 0,
  pending: 1,
  completed: 2,
  cancelled: 3,
}

/** 进行中 → 待办 → 已完成/取消（已完成靠后） */
export function sortTodosForDisplay(todos: AgentTodoItem[]): AgentTodoItem[] {
  return [...todos].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    if (rank !== 0) {
      return rank
    }
    return a.id.localeCompare(b.id)
  })
}

export const MESSAGE_TODO_MAX_VISIBLE = 3

/** 同 id 保留最后一次 TodoWrite 的状态 */
export function dedupeTodosById(todos: AgentTodoItem[]): AgentTodoItem[] {
  const map = new Map<string, AgentTodoItem>()
  for (const item of todos) {
    if (item?.id) {
      map.set(item.id, item)
    }
  }
  return [...map.values()]
}

export function sliceTodosForDisplay(
  sorted: AgentTodoItem[],
  maxVisible: number,
  revealCount: number,
): { visible: AgentTodoItem[]; omitted: number } {
  const cap = Math.min(maxVisible, Math.max(0, revealCount), sorted.length)
  const visible = sorted.slice(0, cap)
  const omitted = Math.max(0, sorted.length - visible.length)
  return { visible, omitted }
}

export function countCompletedTodos(todos: AgentTodoItem[]): number {
  return todos.filter((item) => item.status === 'completed').length
}

export function formatTodoProgress(todos: AgentTodoItem[]): string {
  if (todos.length === 0) {
    return '0/0 已完成'
  }
  return `${countCompletedTodos(todos)}/${todos.length} 已完成`
}
