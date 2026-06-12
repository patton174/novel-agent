import { Loader2 } from 'lucide-react'
import type { CrawlJob } from '@/api/crawlAdminApi'
import { CrawlLogTerminal } from '@/components/admin/CrawlLogTerminal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  crawlJobProgressPercent,
  crawlJobStatusClass,
  crawlJobStatusLabel,
  truncateError,
} from '@/pages/admin/crawlJobUi'
import { parseCrawlJobGoal } from '@/api/crawlAdminApi'
import { APP_MODAL_READER } from '@/lib/appModalClasses'
import { cn } from '@/lib/utils'

interface CrawlJobDetailModalProps {
  job: CrawlJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CrawlJobDetailModal({ job, open, onOpenChange }: CrawlJobDetailModalProps) {
  if (!job) {
    return null
  }

  const goal = parseCrawlJobGoal(job.configJson)
  const percent = crawlJobProgressPercent(job)
  const errorPreview = truncateError(job.errorMessage, 2000)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl', APP_MODAL_READER)}>
        <DialogHeader className="space-y-3 border-b border-border px-6 py-4 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <DialogTitle className="text-lg">{job.title || '解析中…'}</DialogTitle>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                crawlJobStatusClass(job.status),
              )}
            >
              {crawlJobStatusLabel(job.status)}
            </span>
          </div>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm">
              <p className="break-all text-foreground/80">{job.sourceUrl}</p>
              {goal ? <p className="text-muted-foreground">目标：{goal}</p> : null}
              <p className="text-muted-foreground">
                进度 {job.chaptersDone ?? 0}/{job.chaptersTotal ?? '?'}
                {job.catalogNovelId ? ` · 书库 ID ${job.catalogNovelId}` : ''}
              </p>
              {percent != null ? (
                <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              ) : job.status === 'RUNNING' ? (
                <p className="flex items-center gap-2 text-primary">
                  <Loader2 className="size-3.5 animate-spin" />
                  AI 代理执行中…
                </p>
              ) : null}
              {errorPreview ? (
                <p className="break-all text-destructive">{errorPreview}</p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
          <CrawlLogTerminal
            jobId={job.id}
            jobStatus={job.status}
            variant="modal"
            active={open}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
