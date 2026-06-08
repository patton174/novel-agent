import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { fetchSiteContent } from '@/api/billingApi'
import { AgentMarkdown } from '@/components/agent/AgentMarkdown'
import { Button } from '@/components/ui/button'

const DISMISS_PREFIX = 'announcement-dismissed:'

export function DashboardAnnouncementBanner() {
  const [visible, setVisible] = useState(false)
  const [bodyMd, setBodyMd] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetchSiteContent('announcement')
      .then((data) => {
        if (cancelled || !data?.bodyMd?.trim()) return
        const dismissKey = `${DISMISS_PREFIX}${data.updatedAt}`
        if (localStorage.getItem(dismissKey) === '1') return
        setBodyMd(data.bodyMd.trim())
        setVisible(true)
      })
      .catch(() => {
        /* optional banner */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    void fetchSiteContent('announcement').then((data) => {
      if (data?.updatedAt) {
        localStorage.setItem(`${DISMISS_PREFIX}${data.updatedAt}`, '1')
      }
    })
  }

  return (
    <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-50 md:px-8">
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <div className="min-w-0 flex-1 prose prose-sm prose-amber max-w-none dark:prose-invert">
          <AgentMarkdown text={bodyMd} variant="memory" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-amber-900 hover:bg-amber-100 dark:text-amber-100"
          onClick={dismiss}
          aria-label="关闭公告"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
