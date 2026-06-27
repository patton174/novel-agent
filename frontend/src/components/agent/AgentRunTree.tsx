import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { RunTreeNode } from '@/types/agentProfile'
import { resolveProfileLabel } from '@/utils/profileLabels'
import { AgentRunTreeNode } from './AgentRunTreeNode'

export interface AgentRunTreeProps {
  root: RunTreeNode | null
  loading?: boolean
  selectedRunId?: string | null
  onSelectNode?: (node: RunTreeNode) => void
  className?: string
}

function formatDuration(startedAt?: string, endedAt?: string): string | null {
  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  const sec = Math.max(0, Math.round((end - start) / 1000))
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

export function AgentRunTree({
  root,
  loading = false,
  selectedRunId,
  onSelectNode,
  className,
}: AgentRunTreeProps) {
  const { t } = useTranslation(['editor'])

  if (loading) {
    return (
      <div className={cn('px-3 py-2 text-xs text-muted-foreground', className)} data-testid="agent-run-tree-loading">
        {t('editor:runTree.loading')}
      </div>
    )
  }

  if (!root?.runId) {
    return (
      <div className={cn('px-3 py-2 text-xs text-muted-foreground', className)} data-testid="agent-run-tree-empty">
        {t('editor:runTree.empty')}
      </div>
    )
  }

  const renderNode = (node: RunTreeNode, depth = 0) => {
    const label =
      node.roleLabel?.trim() ||
      (node.profileId ? resolveProfileLabel(node.profileId) : node.runId.slice(-8))
    const duration = formatDuration(node.startedAt, node.endedAt)
    return (
      <AgentRunTreeNode
        key={node.runId}
        runId={node.runId}
        label={label}
        profileId={node.profileId}
        status={node.status}
        duration={duration}
        depth={depth}
        selected={selectedRunId === node.runId}
        onClick={() => onSelectNode?.(node)}
      >
        {node.children.map((child) => renderNode(child, depth + 1))}
      </AgentRunTreeNode>
    )
  }

  return (
    <div className={cn('px-2 py-1', className)} data-testid="agent-run-tree">
      {renderNode(root)}
    </div>
  )
}
