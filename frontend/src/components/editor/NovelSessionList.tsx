import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import type { EditorChatSession } from '../../types/editor'
import { KebabMenu } from '../ui/KebabMenu'
import { formatSessionRelativeTime } from '../../utils/formatSessionRelativeTime'
import { isBoilerplateSessionTitle } from '../../utils/sessionTitle'
import {
  groupSessionsByDate,
  type SessionDateGroup,
} from '../../utils/groupSessionsByDate'
import { EDITOR_SESSION_LOAD_MORE } from '@/lib/editorButtonClasses'
import { editorPixelSessionItemClass } from '@/lib/editorPixelClasses'
import {
  SIDEBAR_ICON_CELL,
  SIDEBAR_META,
  SIDEBAR_ROW,
  SIDEBAR_ROW_PAD,
  SIDEBAR_TITLE,
} from '@/lib/sidebarLayoutClasses'
import { SessionStatusIndicator } from './SessionStatusIndicator'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20
const PAGE_STEP = 15
const DEFAULT_VISIBLE_GROUPS: SessionDateGroup[] = ['today', 'yesterday', 'week']

export interface NovelSessionListProps {
  sessions: EditorChatSession[]
  activeSession: string
  runningSessionId?: string | null
  titlePendingSessionIds: Set<string>
  onSwitchSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  onDeleteSession: (sessionId: string) => void
}

export function NovelSessionList({
  sessions,
  activeSession,
  runningSessionId = null,
  titlePendingSessionIds,
  onSwitchSession,
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
      <div className={cn(SIDEBAR_ROW_PAD, 'py-1.5 text-[11px] leading-snug text-muted-foreground/80')}>
        {t('editor:sessionList.noChats')}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-0.5">
      {slices.map(({ group, items }) => (
        <div key={group} className="mb-0.5 flex w-full flex-col gap-0.5">
          <div className={cn(SIDEBAR_ROW_PAD, 'pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/65')}>
            {t(`editor:sessionGroups.${group}`)}
          </div>
          {items.map((session) => {
            const pending = titlePendingSessionIds.has(session.id)
            const isActive = session.id === activeSession
            const isRunning = runningSessionId != null && session.id === runningSessionId
            const title = sessionTitleLabel(session, pending)
            const subtitle = sessionSubtitle(session, pending)
            const systemLike = isBoilerplateSessionTitle(session.title)

            return (
              <div
                key={session.id}
                title={isRunning ? t('editor:sessionList.running') : title}
                className={cn(
                  SIDEBAR_ROW,
                  'group/session cursor-pointer py-1',
                  editorPixelSessionItemClass(isActive),
                )}
                onClick={() => onSwitchSession(session.id)}
              >
                <div className={SIDEBAR_ICON_CELL} aria-hidden>
                  <SessionStatusIndicator running={isRunning} active={isActive} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <span
                      className={cn(
                        SIDEBAR_TITLE,
                        pending || systemLike ? 'font-medium text-muted-foreground' : '',
                      )}
                    >
                      {title}
                    </span>
                    {subtitle ? (
                      <span className={SIDEBAR_META}>{subtitle}</span>
                    ) : null}
                  </div>
                </div>
                <div
                  className={cn(
                    'inline-flex opacity-0 transition-opacity group-hover/session:opacity-100 group-focus-within/session:opacity-100',
                    isActive && 'opacity-100',
                  )}
                  data-session-actions
                  onClick={(e) => e.stopPropagation()}
                >
                  <KebabMenu
                    triggerVariant="ghost"
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
