import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'

import { AgentMarkdown } from '../agent/AgentMarkdown'
import type { MemoryNodeDTO, MemoryTreeNodeSummary } from '../../types/memoryNode'
import { MemoryNavList } from './MemoryNavList'
import { MemoryNodeIcon } from './memoryNodeIcons'

export interface MemoryTreeViewProps {
  scope: string
  roots: MemoryTreeNodeSummary[]
  nodesById: Record<string, MemoryNodeDTO>
  emptyLabel: string
  /** Scope root lives on main tabs — content area is sub-menu + body only. */
  flattenScopeRoot?: boolean
  emptyContentTitle?: string
  emptyContentDescription?: string
  subMenuAriaLabel?: string
}

function MemoryEmptyContent({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[min(280px,45vh)] flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center border-2 border-foreground bg-muted/50 text-muted-foreground shadow-[2px_2px_0_0_var(--foreground)]">
        <FileText className="size-6 opacity-70" aria-hidden />
      </div>
      <p className="text-[14px] font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function MemoryContentPanel({
  detail,
  emptyContentTitle,
  emptyContentDescription,
}: {
  detail?: MemoryNodeDTO
  emptyContentTitle: string
  emptyContentDescription: string
}) {
  const content = (detail?.content || '').trim()
  if (!content) {
    return (
      <MemoryEmptyContent title={emptyContentTitle} description={emptyContentDescription} />
    )
  }
  return (
    <div className="border-2 border-foreground bg-background px-3 py-2.5 font-mono text-[13px] leading-relaxed shadow-[2px_2px_0_0_var(--foreground)]">
      <AgentMarkdown text={content} variant="pixel" />
    </div>
  )
}

function MemoryTwoLevelPanel({
  scopeRootDetail,
  children,
  nodesById,
  emptyContentTitle,
  emptyContentDescription,
  subMenuAriaLabel,
}: {
  scopeRootDetail?: MemoryNodeDTO
  children: MemoryTreeNodeSummary[]
  nodesById: Record<string, MemoryNodeDTO>
  emptyContentTitle: string
  emptyContentDescription: string
  subMenuAriaLabel: string
}) {
  const [activeChildId, setActiveChildId] = useState<string | null>(null)

  useEffect(() => {
    if (children.length === 0) {
      setActiveChildId(null)
      return
    }
    setActiveChildId((prev) => {
      if (prev && children.some((c) => c.memory_id === prev)) return prev
      return children[0]?.memory_id ?? null
    })
  }, [children])

  if (children.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MemoryContentPanel
          detail={scopeRootDetail}
          emptyContentTitle={emptyContentTitle}
          emptyContentDescription={emptyContentDescription}
        />
      </div>
    )
  }

  const activeDetail = activeChildId ? nodesById[activeChildId] : undefined
  const navItems = children.map((child) => {
    const detail = nodesById[child.memory_id]
    return {
      id: child.memory_id,
      label: (
        <span className="flex min-w-0 items-center gap-1.5">
          {detail?.style?.icon ? (
            <MemoryNodeIcon name={String(detail.style.icon)} className="size-3.5 shrink-0" />
          ) : null}
          <span className="truncate">{child.title}</span>
        </span>
      ),
    }
  })

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 min-[520px]:grid-cols-[148px_1fr]">
      <div className="min-w-0 border-border/60 min-[520px]:border-r min-[520px]:pr-2">
        <div className="min-[520px]:hidden">
          <MemoryNavList
            items={navItems}
            activeId={activeChildId ?? ''}
            onChange={setActiveChildId}
            aria-label={subMenuAriaLabel}
            orientation="horizontal"
          />
        </div>
        <div className="hidden min-[520px]:block">
          <MemoryNavList
            items={navItems}
            activeId={activeChildId ?? ''}
            onChange={setActiveChildId}
            aria-label={subMenuAriaLabel}
          />
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-2 min-[520px]:pl-3 min-[520px]:pt-0">
        <MemoryContentPanel
          detail={activeDetail}
          emptyContentTitle={emptyContentTitle}
          emptyContentDescription={emptyContentDescription}
        />
      </div>
    </div>
  )
}

export function MemoryTreeView({
  scope,
  roots,
  nodesById,
  emptyLabel,
  flattenScopeRoot = false,
  emptyContentTitle = '',
  emptyContentDescription = '',
  subMenuAriaLabel = 'Sub entries',
}: MemoryTreeViewProps) {
  const sorted = useMemo(
    () => [...roots].sort((a, b) => a.sort_order - b.sort_order),
    [roots],
  )

  const scopeRoot = sorted.length === 1 ? sorted[0] : null
  const flattenRoot =
    flattenScopeRoot &&
    scopeRoot &&
    (scopeRoot.title.trim() === scope.trim() || sorted.length === 1)

  const childNodes = useMemo(() => {
    if (!flattenRoot || !scopeRoot) {
      return sorted
    }
    return [...(scopeRoot.children ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  }, [flattenRoot, scopeRoot, sorted])

  const scopeRootDetail = scopeRoot ? nodesById[scopeRoot.memory_id] : undefined

  if (sorted.length === 0) {
    return (
      <MemoryEmptyContent
        title={emptyContentTitle || emptyLabel}
        description={emptyContentDescription || emptyLabel}
      />
    )
  }

  if (flattenRoot) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MemoryTwoLevelPanel
          scopeRootDetail={scopeRootDetail}
          children={childNodes}
          nodesById={nodesById}
          emptyContentTitle={emptyContentTitle || emptyLabel}
          emptyContentDescription={emptyContentDescription || emptyLabel}
          subMenuAriaLabel={subMenuAriaLabel}
        />
      </div>
    )
  }

  return (
    <MemoryEmptyContent
      title={emptyContentTitle || emptyLabel}
      description={emptyContentDescription || emptyLabel}
    />
  )
}
