import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import type { EditorChatSession } from '../../types/editor'
import { EditorButton } from '../ui/EditorButton'
import { KebabMenu } from '../ui/KebabMenu'
import { formatSessionRelativeTime } from '../../utils/formatSessionRelativeTime'
import { isBoilerplateSessionTitle } from '../../utils/sessionTitle'
import {
  groupSessionsByDate,
  type SessionDateGroup,
} from '../../utils/groupSessionsByDate'
import { EDITOR_SESSION_LOAD_MORE } from '@/lib/editorButtonClasses'
import { cn } from '@/lib/utils'

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
  const { t } = useTranslation(['editor'])
  const [showOlder, setShowOlder] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE)

  function sessionTitleLabel(session: EditorChatSession, titlePending: boolean): string {
    if (titlePending) return t('editor:sessionList.generatingTitle')
    const title = session.title.trim()
    return title || t('editor:sessionList.newChat')
  }

  function sessionSubtitle(session: EditorChatSession, titlePending: boolean): string {
    if (titlePending) return ''
    return formatSessionRelativeTime(session.updatedAt)
  }

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
    return (
      <div className="px-0.5 py-1.5 text-xs leading-snug text-muted-foreground/80">{t('editor:sessionList.noChats')}</div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-0.5">
      {slices.map(({ group, label: _label, items }) => (
        <div key={group} className="mb-1 flex w-full flex-col gap-0.5">
          <div className="px-0.5 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {t(`editor:sessionGroups.${group}`)}
          </div>
          {items.map((session) => {
            const selected = selectedSessionIds.has(session.id)
            const pending = titlePendingSessionIds.has(session.id)
            const isActive = !batchMode && session.id === activeSession
            const title = sessionTitleLabel(session, pending)
            const subtitle = sessionSubtitle(session, pending)
            const systemLike = isBoilerplateSessionTitle(session.title)
            return (
              <div
                key={session.id}
                title={title}
                className={cn(
                  'group/session flex w-full cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5',
                  isActive
                    ? 'border-border/70 bg-muted/60 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
                onClick={() => {
                  if (batchMode) {
                    onToggleSessionSelected(session.id)
                    return
                  }
                  onSwitchSession(session.id)
                }}
              >
                {batchMode ? (
                  <input
                    type="checkbox"
                    className="m-0 shrink-0 cursor-pointer"
                    checked={selected}
                    onChange={() => onToggleSessionSelected(session.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      'ml-0.5 size-1 shrink-0 rounded-full bg-foreground/35',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[13px] font-medium',
                        pending
                          ? 'text-muted-foreground'
                          : systemLike
                            ? 'text-muted-foreground'
                            : 'text-foreground',
                      )}
                    >
                      {title}
                    </span>
                    {subtitle ? (
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/70">
                        {subtitle}
                      </span>
                    ) : null}
                  </div>
                </div>
                {!batchMode ? (
                  <div
                    className={cn(
                      'inline-flex opacity-0 transition-opacity group-hover/session:opacity-100',
                      isActive && 'opacity-100',
                    )}
                    data-session-actions
                    onClick={(e) => e.stopPropagation()}
                  >
                    <KebabMenu
                      aria-label={t('editor:sessionList.sessionActions')}
                      items={[
                        {
                          id: 'rename',
                          label: t('editor:sessionList.rename'),
                          onClick: () => onRenameSession(session.id, session.title),
                        },
                        {
                          id: 'delete',
                          label: t('editor:sessionList.delete'),
                          danger: true,
                          onClick: () => onDeleteSession(session.id),
                        },
                      ]}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ))}

      {!showOlder && olderCount > 0 ? (
        <button type="button" className={EDITOR_SESSION_LOAD_MORE} onClick={() => setShowOlder(true)}>
          {t('editor:sessionList.viewOlder', { count: olderCount })}
        </button>
      ) : null}

      {hasMoreInList ? (
        <button
          type="button"
          className={EDITOR_SESSION_LOAD_MORE}
          onClick={() => setVisibleLimit((n) => n + PAGE_STEP)}
        >
          {t('editor:sessionList.loadMore', { shown: totalShown, total: totalAvailable })}
        </button>
      ) : null}
    </div>
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
  const { t } = useTranslation(['editor'])
  return (
    <div className="flex w-full flex-wrap gap-1.5 pb-1.5">
      <EditorButton variant="ghost" size="sm" type="button" onClick={onExitBatchMode}>
        {t('editor:sessionList.done')}
      </EditorButton>
      <EditorButton variant="ghost" size="sm" type="button" onClick={onSelectAll}>
        {allSelected ? t('editor:sessionList.unselectAll') : t('editor:sessionList.selectAll', { count: totalCount })}
      </EditorButton>
      <EditorButton
        variant="danger"
        size="sm"
        type="button"
        disabled={selectedCount === 0}
        onClick={onBatchDelete}
      >
        {t('editor:sessionList.deleteCount', { count: selectedCount })}
      </EditorButton>
    </div>
  )
}
