import type { MouseEvent } from 'react'
import { Loader2, MoreHorizontal, Pause, Play, Square, Trash2 } from 'lucide-react'
import type { CrawlJob } from '@/api/crawlAdminApi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PixelTableActionBar,
  PixelTableActionButton,
  PixelTableActionIconButton,
} from '@/components/pixel'
import {
  CRAWL_JOB_ACTION_META,
  type CrawlJobAction,
  crawlJobActions,
} from '@/pages/admin/crawlJobUi'
import { cn } from '@/lib/utils'

const ACTION_ICONS: Record<CrawlJobAction, typeof Play> = {
  start: Play,
  pause: Pause,
  cancel: Square,
  delete: Trash2,
}

function pickPrimaryAction(actions: CrawlJobAction[]): CrawlJobAction | undefined {
  return actions.find((a) => a === 'start' || a === 'pause') ?? actions[0]
}

export interface CrawlJobActionsProps {
  job: CrawlJob
  actingKey: string | null
  onAction: (job: CrawlJob, action: CrawlJobAction) => void
  /** icon：桌面行内；compact：移动主按钮+菜单；labeled：弹窗底栏带文字 */
  variant?: 'icon' | 'compact' | 'labeled'
  className?: string
  align?: 'start' | 'end'
}

export function CrawlJobActions({
  job,
  actingKey,
  onAction,
  variant = 'icon',
  className,
  align = 'end',
}: CrawlJobActionsProps) {
  const actions = crawlJobActions(job.status)
  if (actions.length === 0) return null

  const primaryAction = pickPrimaryAction(actions)
  const menuActions = primaryAction ? actions.filter((a) => a !== primaryAction) : actions
  const stop = (e: MouseEvent) => e.stopPropagation()

  const renderButton = (action: CrawlJobAction, labeled: boolean) => {
    const meta = CRAWL_JOB_ACTION_META[action]
    const Icon = ACTION_ICONS[action]
    const busy = actingKey === `${job.id}:${action}`
    const isDestructive = meta.variant === 'destructive'

    if (labeled) {
      return (
        <PixelTableActionButton
          key={action}
          variant={isDestructive ? 'danger' : action === 'cancel' ? 'secondary' : 'primary'}
          disabled={actingKey != null && !busy}
          onClick={(e) => {
            stop(e)
            onAction(job, action)
          }}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
          {meta.label()}
        </PixelTableActionButton>
      )
    }

    return (
      <PixelTableActionIconButton
        key={action}
        variant={isDestructive ? 'danger' : 'ghost'}
        title={meta.label()}
        disabled={actingKey != null && !busy}
        onClick={(e) => {
          stop(e)
          onAction(job, action)
        }}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      </PixelTableActionIconButton>
    )
  }

  if (variant === 'labeled') {
    return (
      <PixelTableActionBar align={align} className={className}>
        {actions.map((action) => renderButton(action, true))}
      </PixelTableActionBar>
    )
  }

  if (variant === 'compact') {
    return (
      <PixelTableActionBar align={align} className={className}>
        {primaryAction ? (
          <PixelTableActionButton
            variant={
              CRAWL_JOB_ACTION_META[primaryAction].variant === 'destructive' ? 'danger' : 'primary'
            }
            disabled={actingKey != null && actingKey !== `${job.id}:${primaryAction}`}
            onClick={(e) => {
              e.stopPropagation()
              onAction(job, primaryAction)
            }}
          >
            {actingKey === `${job.id}:${primaryAction}` ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              (() => {
                const Icon = ACTION_ICONS[primaryAction]
                return <Icon className="size-3.5" />
              })()
            )}
            {CRAWL_JOB_ACTION_META[primaryAction].label()}
          </PixelTableActionButton>
        ) : null}
        {menuActions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <PixelTableActionIconButton variant="secondary" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </PixelTableActionIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {menuActions.map((action) => {
                const meta = CRAWL_JOB_ACTION_META[action]
                const Icon = ACTION_ICONS[action]
                return (
                  <DropdownMenuItem
                    key={action}
                    variant={meta.variant === 'destructive' ? 'destructive' : 'default'}
                    disabled={actingKey != null}
                    onClick={() => onAction(job, action)}
                  >
                    <Icon className="size-3.5" />
                    {meta.label()}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </PixelTableActionBar>
    )
  }

  return (
    <PixelTableActionBar align={align} className={cn(className)}>
      {actions.map((action) => renderButton(action, false))}
    </PixelTableActionBar>
  )
}
