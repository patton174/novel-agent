import { useMemo, useState } from 'react'
import styled, { css } from 'styled-components'
import type { EditorChatSession } from '../../types/editor'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { EditorButton } from '../ui/EditorButton'
import { KebabMenu } from '../ui/KebabMenu'
import { formatSessionRelativeTime } from '../../utils/formatSessionRelativeTime'
import { isBoilerplateSessionTitle } from '../../utils/sessionTitle'
import {
  groupSessionsByDate,
  type SessionDateGroup,
} from '../../utils/groupSessionsByDate'

const PAGE_SIZE = 20
const PAGE_STEP = 15
const DEFAULT_VISIBLE_GROUPS: SessionDateGroup[] = ['today', 'yesterday', 'week']

export interface NovelSessionListProps {
  sessions: EditorChatSession[]
  activeSession: string
  batchMode: boolean
  selectedSessionIds: Set<string>
  titlePendingSessionIds: Set<string>
  onSwitchSession: (sessionId: string) => void
  onToggleSessionSelected: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  onDeleteSession: (sessionId: string) => void
}

function sessionTitleLabel(session: EditorChatSession, titlePending: boolean): string {
  if (titlePending) return '生成标题…'
  const title = session.title.trim()
  return title || '新对话'
}

function sessionSubtitle(
  session: EditorChatSession,
  titlePending: boolean,
): string {
  if (titlePending) return ''
  return formatSessionRelativeTime(session.updatedAt)
}

export function NovelSessionList({
  sessions,
  activeSession,
  batchMode,
  selectedSessionIds,
  titlePendingSessionIds,
  onSwitchSession,
  onToggleSessionSelected,
  onRenameSession,
  onDeleteSession,
}: NovelSessionListProps) {
  const [showOlder, setShowOlder] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE)

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [sessions],
  )

  const allGroups = useMemo(() => groupSessionsByDate(sorted), [sorted])
  const olderCount = useMemo(
    () => allGroups.find((g) => g.group === 'older')?.items.length ?? 0,
    [allGroups],
  )

  const displayGroups = useMemo(() => {
    if (showOlder) return allGroups
    return allGroups.filter((g) => DEFAULT_VISIBLE_GROUPS.includes(g.group))
  }, [allGroups, showOlder])

  const { slices, hasMoreInList, totalShown, totalAvailable } = useMemo(() => {
    let shown = 0
    let available = 0
    const out: Array<{
      group: SessionDateGroup
      label: string
      items: EditorChatSession[]
    }> = []

    for (const group of displayGroups) {
      available += group.items.length
      if (shown >= visibleLimit) continue
      const remaining = visibleLimit - shown
      const slice = group.items.slice(0, remaining)
      if (slice.length > 0) {
        out.push({ ...group, items: slice })
        shown += slice.length
      }
    }

    return {
      slices: out,
      hasMoreInList: shown < available,
      totalShown: shown,
      totalAvailable: available,
    }
  }, [displayGroups, visibleLimit])

  if (sessions.length === 0) {
    return <EmptyHint>暂无对话</EmptyHint>
  }

  return (
    <ListWrap>
      {slices.map(({ group, label, items }) => (
        <GroupBlock key={group}>
          <GroupLabel>{label}</GroupLabel>
          {items.map((session) => {
            const selected = selectedSessionIds.has(session.id)
            const pending = titlePendingSessionIds.has(session.id)
            const isActive = !batchMode && session.id === activeSession
            const title = sessionTitleLabel(session, pending)
            const subtitle = sessionSubtitle(session, pending)
            const systemLike = isBoilerplateSessionTitle(session.title)
            return (
              <SessionItem
                key={session.id}
                $active={isActive}
                $batch={batchMode}
                title={title}
                onClick={() => {
                  if (batchMode) {
                    onToggleSessionSelected(session.id)
                    return
                  }
                  onSwitchSession(session.id)
                }}
              >
                {batchMode ? (
                  <SessionCheckbox
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSessionSelected(session.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <ActiveDot $visible={isActive} aria-hidden />
                )}
                <SessionInfo>
                  <SessionTitleRow>
                    <SessionTitle $dim={pending} $muted={systemLike}>
                      {title}
                    </SessionTitle>
                    {subtitle ? <SessionMeta>{subtitle}</SessionMeta> : null}
                  </SessionTitleRow>
                </SessionInfo>
                {!batchMode ? (
                  <SessionActions
                    data-session-actions
                    onClick={(e) => e.stopPropagation()}
                  >
                    <KebabMenu
                      aria-label="会话操作"
                      items={[
                        {
                          id: 'rename',
                          label: '重命名',
                          onClick: () => onRenameSession(session.id, session.title),
                        },
                        {
                          id: 'delete',
                          label: '删除',
                          danger: true,
                          onClick: () => onDeleteSession(session.id),
                        },
                      ]}
                    />
                  </SessionActions>
                ) : null}
              </SessionItem>
            )
          })}
        </GroupBlock>
      ))}

      {!showOlder && olderCount > 0 ? (
        <LoadMoreButton type="button" onClick={() => setShowOlder(true)}>
          查看更早（{olderCount}）
        </LoadMoreButton>
      ) : null}

      {hasMoreInList ? (
        <LoadMoreButton
          type="button"
          onClick={() => setVisibleLimit((n) => n + PAGE_STEP)}
        >
          加载更多（{totalShown}/{totalAvailable}）
        </LoadMoreButton>
      ) : null}
    </ListWrap>
  )
}

export function NovelSessionBatchBar({
  selectedCount,
  totalCount,
  allSelected,
  onExitBatchMode,
  onSelectAll,
  onBatchDelete,
}: {
  selectedCount: number
  totalCount: number
  allSelected: boolean
  onExitBatchMode: () => void
  onSelectAll: () => void
  onBatchDelete: () => void
}) {
  return (
    <BatchBar>
      <EditorButton variant="ghost" size="sm" type="button" onClick={onExitBatchMode}>
        完成
      </EditorButton>
      <EditorButton variant="ghost" size="sm" type="button" onClick={onSelectAll}>
        {allSelected ? '取消全选' : `全选 (${totalCount})`}
      </EditorButton>
      <EditorButton
        variant="danger"
        size="sm"
        type="button"
        disabled={selectedCount === 0}
        onClick={onBatchDelete}
      >
        删除 ({selectedCount})
      </EditorButton>
    </BatchBar>
  )
}

const ListWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  width: 100%;
`

const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  width: 100%;
  margin-bottom: 0.2rem;
`

const GroupLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 600;
  color: ${editorTheme.textMuted};
  padding: 0.4rem 0.1rem 0.2rem;
  letter-spacing: 0.02em;
`

const SessionItem = styled.div<{ $active?: boolean; $batch?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.45rem 0.45rem 0.35rem;
  border-radius: 8px;
  cursor: pointer;
  background: ${(p) => (p.$active ? editorTheme.activeBg : 'transparent')};
  border: 1px solid ${(p) => (p.$active ? palette.accentBorderLight : 'transparent')};
  &:hover {
    background: ${(p) => (p.$active ? editorTheme.activeBg : editorTheme.accentMuted)};
  }
  &:hover [data-session-actions] {
    opacity: 1;
  }
  ${(p) =>
    p.$active &&
    !p.$batch &&
    css`
      [data-session-actions] {
        opacity: 1;
      }
    `}
`

const ActiveDot = styled.span<{ $visible: boolean }>`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${editorTheme.accent};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  margin-left: 2px;
`

const SessionCheckbox = styled.input`
  flex-shrink: 0;
  margin: 0;
  cursor: pointer;
`

const SessionActions = styled.div`
  display: inline-flex;
  opacity: 0;
  transition: opacity 0.15s ease;
`

const SessionInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const SessionTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
`

const SessionTitle = styled.span<{ $dim?: boolean; $muted?: boolean }>`
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ $dim, $muted }) =>
    $dim ? palette.textMuted : $muted ? palette.textSecondary : editorTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SessionMeta = styled.span`
  flex-shrink: 0;
  font-size: 0.62rem;
  color: ${palette.textFaint};
  white-space: nowrap;
`

const EmptyHint = styled.div`
  font-size: 0.76rem;
  color: ${palette.textFaint};
  padding: 0.35rem 0.1rem;
  line-height: 1.45;
`

const LoadMoreButton = styled.button`
  width: 100%;
  box-sizing: border-box;
  margin: 0.2rem 0 0.1rem;
  padding: 0.4rem 0.5rem;
  border: 1px dashed ${editorTheme.border};
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 0.72rem;
  color: ${palette.textMuted};
  cursor: pointer;
  &:hover {
    background: ${editorTheme.accentMuted};
    color: ${editorTheme.text};
  }
`

const BatchBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0 0 0.4rem;
`
