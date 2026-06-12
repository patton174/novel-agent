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
    <div className="border-b border-primary/20 bg-gradient-to-r from-primary/[0.06] via-indigo-500/[0.04] to-violet-500/[0.05] px-4 py-3 text-sm text-foreground md:px-8">
      <div className="mx-auto flex max-w-[1440px] items-start gap-3">
        <div className="min-w-0 flex-1 prose prose-sm max-w-none text-foreground/90">
          <AgentMarkdown text={bodyMd} variant="memory" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          onClick={dismiss}
          aria-label="关闭公告"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
