import styled from 'styled-components'
import type { AgentTodoItem } from '../../../types/agent'
import { editorTheme } from '../../../styles/editorTheme'
import { textStyle } from '../../../styles/typography'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { CcToolBranchLine } from './CcToolRow'
import { TodoRowIcon } from './TodoRowIcon'

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
    <Wrap data-testid="timeline-todo-list" $embedded={embedded}>
      {!embedded ? (
        <Meta>
          {done}/{todos.length} 已完成
        </Meta>
      ) : null}
      <List>
        {todos.map((item, index) => {
          const executing = item.status === 'in_progress'
          const shimmer = executing
          return (
            <Row
              key={item.id}
              $status={item.status}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <TodoRowIcon status={item.status} />
              {executing ? (
                <Text $executing as="span">
                  <ShimmerScanText active={shimmer}>{item.content}</ShimmerScanText>
                </Text>
              ) : (
                <Text $done={item.status === 'completed' || item.status === 'cancelled'}>
                  {item.content}
                </Text>
              )}
            </Row>
          )
        })}
      </List>
    </Wrap>
  )

  if (embedded) {
    return list
  }
  return <CcToolBranchLine>{list}</CcToolBranchLine>
}

const Wrap = styled.div<{ $embedded?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
`

const Meta = styled.div`
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`

const Row = styled.li<{ $status: AgentTodoItem['status'] }>`
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  padding: 0.12rem 0;
  opacity: ${({ $status }) => ($status === 'cancelled' ? 0.55 : 1)};
  animation: todoRowIn 0.22s ease-out both;

  @keyframes todoRowIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const Text = styled.span<{ $done?: boolean; $executing?: boolean }>`
  flex: 1;
  min-width: 0;
  ${textStyle('uiSm')}
  line-height: 1.45;
  color: ${editorTheme.textSecondary};
  text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
  opacity: ${({ $done, $executing }) => ($done ? 0.72 : $executing ? 1 : 1)};
`
