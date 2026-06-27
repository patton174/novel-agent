import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  agentTraceStatusDotClass,
} from '@/lib/agentTraceClasses'

export interface AgentRunTreeNodeProps {
  runId: string
  label: string
  profileId?: string
  status: string
  duration?: string | null
  depth: number
  selected?: boolean
  onClick?: () => void
  children?: ReactNode
}

export function AgentRunTreeNode({
  label,
  profileId,
  status,
  duration,
  depth,
  selected,
  onClick,
  children,
}: AgentRunTreeNodeProps) {
  const failed = status === 'failed' || status === 'error'
  const active = status === 'running' || status === 'started' || status === 'active'

  return (
    <div className="min-w-0" style={{ paddingLeft: depth > 0 ? `${depth * 0.65}rem` : undefined }}>
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-start gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50',
          selected && 'bg-muted/60',
        )}
        onClick={onClick}
        data-testid={`agent-run-tree-node-${profileId ?? 'run'}`}
      >
        <span className={agentTraceStatusDotClass({ failed, active })} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.74rem] font-medium text-foreground">{label}</span>
          <span className="mt-0.5 flex flex-wrap gap-2 text-[0.65rem] text-muted-foreground">
            {profileId ? <span>{profileId}</span> : null}
            {duration ? <span>{duration}</span> : null}
            <span>{status}</span>
          </span>
        </span>
      </button>
      {children ? <div className="border-l border-border/60 pl-1">{children}</div> : null}
    </div>
  )
}
