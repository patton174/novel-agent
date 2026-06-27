import { Check, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SkillTimelineStatus } from '@/types/agent'
import { cn } from '@/lib/utils'

export interface TimelineSkillBlockProps {
  name: string
  status: SkillTimelineStatus
}

export function TimelineSkillBlock({ name, status }: TimelineSkillBlockProps) {
  const { t } = useTranslation('editor')

  const statusLabel =
    status === 'loaded'
      ? t('timeline.skill.loaded', { name })
      : status === 'failed'
        ? t('timeline.skill.failed', { name })
        : t('timeline.skill.started', { name })

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm"
      data-testid="timeline-skill-block"
    >
      <span
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
          status === 'loaded' && 'bg-emerald-500/15 text-emerald-600',
          status === 'failed' && 'bg-destructive/15 text-destructive',
          status === 'started' && 'bg-primary/10 text-primary',
        )}
        aria-hidden
      >
        {status === 'loaded' ? (
          <Check className="size-3.5" />
        ) : status === 'failed' ? (
          <X className="size-3.5" />
        ) : (
          <Loader2 className="size-3.5 animate-spin" />
        )}
      </span>
      <span className="min-w-0 truncate text-foreground">{statusLabel}</span>
    </div>
  )
}
