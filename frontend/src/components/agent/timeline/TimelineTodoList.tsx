import type { AgentTodoItem } from '../../../types/agent'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { CcToolBranchLine } from './CcToolRow'
import { TodoRowIcon } from './TodoRowIcon'
import {
  TIMELINE_TODO_LIST,
  TIMELINE_TODO_META,
  TIMELINE_TODO_WRAP,
  timelineTodoRowClass,
  timelineTodoTextClass,
} from '@/lib/timelineClasses'

export function TimelineTodoList({
  todos,
  embedded = false,
}: {
  todos: AgentTodoItem[]
  /** 消息顶栏内嵌：无工具分支线与重复统计 */
  embedded?: boolean
}) {
  if (!todos.length) {
    return null
  }

  const done = todos.filter((t) => t.status === 'completed').length

  const list = (
    <div data-testid="timeline-todo-list" className={TIMELINE_TODO_WRAP}>
      {!embedded ? (
        <div className={TIMELINE_TODO_META}>
          {done}/{todos.length} 已完成
        </div>
      ) : null}
      <ul className={TIMELINE_TODO_LIST}>
        {todos.map((item, index) => {
          const executing = item.status === 'in_progress'
          const shimmer = executing
          return (
            <li
              key={item.id}
              className={timelineTodoRowClass(item.status)}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <TodoRowIcon status={item.status} />
              {executing ? (
                <span className={timelineTodoTextClass({ executing: true })}>
                  <ShimmerScanText active={shimmer}>{item.content}</ShimmerScanText>
                </span>
              ) : (
                <span
                  className={timelineTodoTextClass({
                    done: item.status === 'completed' || item.status === 'cancelled',
                  })}
                >
                  {item.content}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )

  if (embedded) {
    return list
  }
  return <CcToolBranchLine>{list}</CcToolBranchLine>
}
