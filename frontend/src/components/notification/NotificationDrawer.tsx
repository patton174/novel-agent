import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  fetchInbox,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationCategory,
  type UserNotification,
} from '@/api/notificationApi'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { formatSessionRelativeTime } from '@/utils/formatSessionRelativeTime'
import { appToast } from '@/stores/appToastStore'

const PAGE_SIZE = 20

const CATEGORY_CLASS: Record<NotificationCategory, string> = {
  system: 'bg-muted text-foreground',
  billing: 'bg-neon/30 text-foreground',
  agent: 'bg-primary/15 text-foreground',
  marketing: 'bg-accent/40 text-foreground',
}

function resolvePayloadLink(payload?: Record<string, unknown> | null): string | null {
  if (!payload) return null
  const link = payload.link ?? payload.path ?? payload.href
  return typeof link === 'string' && link.trim() ? link.trim() : null
}

interface NotificationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnreadChange?: Dispatch<SetStateAction<number>>
}

export function NotificationDrawer({ open, onOpenChange, onUnreadChange }: NotificationDrawerProps) {
  const { t } = useTranslation(['notification'])
  const navigate = useNavigate()
  const [items, setItems] = useState<UserNotification[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const bumpUnread = useCallback(
    (delta: number) => {
      onUnreadChange?.((prev) => Math.max(0, prev + delta))
    },
    [onUnreadChange],
  )

  const loadInbox = useCallback(async (cursor?: string) => {
      const isMore = Boolean(cursor)
      if (isMore) setLoadingMore(true)
      else setLoading(true)
      try {
        const page = await fetchInbox({ cursor, limit: PAGE_SIZE })
        setItems((prev) => (isMore ? [...prev, ...page.items] : page.items))
        setNextCursor(page.nextCursor ?? null)
        setHasMore(Boolean(page.hasMore))
      } finally {
        if (isMore) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!open) return
    void loadInbox()
  }, [open, loadInbox])

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
      onUnreadChange?.(0)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('notification:drawer.loading'))
    }
  }

  const handleItemClick = async (item: UserNotification) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id)
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
          ),
        )
        bumpUnread(-1)
      } catch {
        // still allow navigation on failure
      }
    }

    const link = resolvePayloadLink(item.payload)
    if (link) {
      onOpenChange(false)
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank', 'noopener,noreferrer')
      } else {
        navigate(link)
      }
    }
  }

  const unreadInList = items.some((item) => !item.readAt)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 border-l-2 border-foreground p-0"
      >
        <SheetHeader className="border-b-2 border-foreground/15 px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="font-mono text-sm font-black uppercase tracking-tight">
              {t('notification:drawer.title')}
            </SheetTitle>
            {unreadInList ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 font-mono text-[10px] font-bold uppercase"
                onClick={() => void handleMarkAllRead()}
              >
                {t('notification:drawer.markAllRead')}
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
              {t('notification:drawer.loading')}
            </p>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-mono text-sm font-bold">{t('notification:drawer.emptyTitle')}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t('notification:drawer.emptyDesc')}</p>
            </div>
          ) : null}

          <ul className="divide-y divide-foreground/10">
            {items.map((item) => {
              const created = new Date(item.createdAt)
              const timeLabel = Number.isNaN(created.getTime())
                ? ''
                : formatSessionRelativeTime(created)
              const category = item.category ?? 'system'
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void handleItemClick(item)}
                    className={cn(
                      'flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-muted/40',
                      !item.readAt && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'shrink-0 border border-foreground/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase',
                          CATEGORY_CLASS[category] ?? CATEGORY_CLASS.system,
                        )}
                      >
                        {t(`notification:category.${category}`, { defaultValue: category })}
                      </span>
                      {timeLabel ? (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {timeLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className={cn('text-sm leading-snug', !item.readAt && 'font-semibold')}>
                      {item.title}
                    </p>
                    {item.body ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>

          {hasMore && nextCursor ? (
            <div className="border-t border-foreground/10 p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full font-mono text-xs font-bold uppercase"
                disabled={loadingMore}
                onClick={() => void loadInbox(nextCursor)}
              >
                {loadingMore ? t('notification:drawer.loading') : t('notification:drawer.loadMore')}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
