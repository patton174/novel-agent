import { useEffect, useState } from 'react'
import { fetchSiteContent } from '@/api/billingApi'
import { AgentMarkdown } from '@/components/agent/AgentMarkdown'
import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'
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
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <MarketingNav />
      <main className="flex-1 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-3xl shadow-soft border border-border">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">{title}</h1>
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
      </main>
      <HomeFooterSection />
    </div>
  )
}
