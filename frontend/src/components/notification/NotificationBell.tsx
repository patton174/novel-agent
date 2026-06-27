import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { fetchUnreadCount } from '@/api/notificationApi'
import { NotificationDrawer } from '@/components/notification/NotificationDrawer'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { usePageVisible } from '@/hooks/usePageVisible'

const POLL_MS = 60_000

export function NotificationBell() {
  const { t } = useTranslation(['notification'])
  const pageVisible = usePageVisible()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshUnread = useCallback(async () => {
    const count = await fetchUnreadCount()
    setUnreadCount(count)
  }, [])

  useEffect(() => {
    void refreshUnread()
  }, [refreshUnread])

  useEffect(() => {
    if (!pageVisible) return
    void refreshUnread()
    const timer = window.setInterval(() => {
      void refreshUnread()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [pageVisible, refreshUnread])

  useEffect(() => {
    const onFocus = () => {
      void refreshUnread()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshUnread])

  const badge =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          badge
            ? t('notification:bell.unread', { count: unreadCount })
            : t('notification:bell.label')
        }
        title={t('notification:bell.label')}
        className={cn(editorPixelIconButtonClass(), 'relative text-foreground')}
      >
        <Bell className="size-4" strokeWidth={2.25} />
        {badge ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-h-[14px] min-w-[14px] items-center justify-center rounded-sm border border-foreground bg-neon px-0.5 font-mono text-[9px] font-black leading-none text-ink"
            aria-hidden
          >
            {badge}
          </span>
        ) : null}
      </button>

      <NotificationDrawer
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) void refreshUnread()
        }}
        onUnreadChange={setUnreadCount}
      />
    </>
  )
}
