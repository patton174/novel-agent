import { useEffect, useState } from 'react'
import { ChevronRight, Megaphone, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchSiteContent, type SiteContent } from '@/api/billingApi'
import { SiteContentLocaleFallback } from '@/components/content/SiteContentLocaleFallback'
import { SiteMarkdown, markdownPlainPreview } from '@/components/content/SiteMarkdown'
import { AppSheetModal } from '@/components/ui/AppSheetModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISS_PREFIX = 'announcement-dismissed:'

export function DashboardAnnouncementBanner() {
  const { t, i18n } = useTranslation(['dashboard'])
  const [announcement, setAnnouncement] = useState<SiteContent | null>(null)
  const [visible, setVisible] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchSiteContent('announcement')
      .then((data) => {
        if (cancelled || !data?.bodyMd?.trim()) return
        const dismissKey = `${DISMISS_PREFIX}${data.updatedAt}`
        if (localStorage.getItem(dismissKey) === '1') return
        setAnnouncement(data)
        setVisible(true)
      })
      .catch(() => {
        /* optional banner */
      })
    return () => {
      cancelled = true
    }
  }, [i18n.language])

  if (!visible || !announcement?.bodyMd?.trim()) return null

  const title = announcement.title?.trim() || t('dashboard:announcement.defaultTitle')
  const preview = markdownPlainPreview(announcement.bodyMd, 220)

  const dismiss = () => {
    setVisible(false)
    setModalOpen(false)
    if (announcement.updatedAt) {
      localStorage.setItem(`${DISMISS_PREFIX}${announcement.updatedAt}`, '1')
    }
  }

  return (
    <>
      <div className="border-b border-primary/15 bg-gradient-to-r from-primary/[0.06] via-indigo-500/[0.04] to-violet-500/[0.05] px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-6xl items-start gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={cn(
              'group min-w-0 flex-1 rounded-xl border border-border/50 bg-background/60 text-left shadow-xs',
              'transition-colors hover:border-primary/30 hover:bg-background/80',
            )}
          >
            <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
              <Megaphone className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {title}
              </span>
              <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
                {t('dashboard:announcement.viewDetail')}
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
            <div className="relative max-h-20 overflow-y-auto px-3 py-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">{preview}</p>
              <div
                aria-hidden
                className="pointer-events-none sticky bottom-0 -mb-2 h-4 bg-gradient-to-t from-background/90 to-transparent"
              />
            </div>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            onClick={dismiss}
            aria-label={t('dashboard:announcement.dismiss')}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <AppSheetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={title}
        modalSize="detail"
        modalClassName="sm:max-w-2xl"
        bodyClassName="px-6 py-5"
      >
        <SiteContentLocaleFallback localeResolved={announcement.localeResolved} className="mb-3" />
        <SiteMarkdown text={announcement.bodyMd} />
      </AppSheetModal>
    </>
  )
}
