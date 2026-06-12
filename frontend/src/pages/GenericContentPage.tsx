import { useEffect, useState } from 'react'
import { fetchSiteContent } from '@/api/billingApi'
import { AgentMarkdown } from '@/components/agent/AgentMarkdown'
import { MarketingPageLayout } from '@/components/marketing/MarketingPageLayout'
import { Skeleton } from '@/components/ui/skeleton'

interface GenericContentPageProps {
  contentKey: string
  fallbackTitle: string
}

export default function GenericContentPage({ contentKey, fallbackTitle }: GenericContentPageProps) {
  const [title, setTitle] = useState(fallbackTitle)
  const [bodyMd, setBodyMd] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchSiteContent(contentKey)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setTitle(data.title || fallbackTitle)
          setBodyMd(data.bodyMd)
        } else {
          setBodyMd('')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contentKey, fallbackTitle])

  return (
    <MarketingPageLayout>
      <div className="relative overflow-hidden px-6 pb-24 pt-28">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-80 w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="relative mx-auto max-w-3xl rounded-3xl border border-border/70 bg-surface/95 p-10 shadow-soft backdrop-blur-sm md:p-14">
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : bodyMd?.trim() ? (
            <div className="prose prose-slate max-w-none text-muted-foreground">
              <AgentMarkdown text={bodyMd} variant="memory" />
            </div>
          ) : (
            <p className="text-muted-foreground">内容暂未发布，请稍后再来查看。</p>
          )}
        </div>
      </div>
    </MarketingPageLayout>
  )
}
