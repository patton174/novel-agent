import { FileText } from 'lucide-react'

import { AgentMarkdown } from '../agent/AgentMarkdown'
import type { MemoryNodeDTO } from '../../types/memoryNode'
import { resolveNodePresentation } from './memoryStylePresets'
import { MemoryNodeIcon } from './memoryNodeIcons'
import { cn } from '@/lib/utils'

function MemoryEmptyContent({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[min(240px,40vh)] flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
        <FileText className="size-5 opacity-70" aria-hidden />
      </div>
      <p className="text-[14px] font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

export interface MemoryContentPanelProps {
  detail?: MemoryNodeDTO
  scope?: string
  emptyContentTitle: string
  emptyContentDescription: string
  /** 侧栏已展示标题时隐藏正文区重复标题 */
  showHeader?: boolean
  /** 弹窗右侧正文区：去掉 layout 外框，避免多层灰框嵌套 */
  embedded?: boolean
}

export function MemoryContentPanel({
  detail,
  scope,
  emptyContentTitle,
  emptyContentDescription,
  showHeader = true,
  embedded = false,
}: MemoryContentPanelProps) {
  const content = (detail?.content || '').trim()
  if (!content) {
    return (
      <MemoryEmptyContent title={emptyContentTitle} description={emptyContentDescription} />
    )
  }

  const presentation = resolveNodePresentation(detail?.style ?? null, {
    scope,
    nodeKind: detail?.node_kind,
    isRoot: !detail?.parent_id,
  })

  return (
    <article
      className={cn(
        embedded ? 'min-w-0' : presentation.containerClass,
        presentation.levelIndentClass,
      )}
      style={embedded ? undefined : presentation.accentStyle}
    >
      {showHeader ? (
        <header className={cn('flex items-center gap-2', presentation.titleClass)}>
          {presentation.icon ? (
            <MemoryNodeIcon name={presentation.icon} className="size-4 shrink-0 opacity-80" />
          ) : null}
          <h3 className="min-w-0 truncate">{detail?.title}</h3>
        </header>
      ) : null}
      <div className={cn(embedded ? '' : 'mt-2', presentation.contentClass)}>
        <AgentMarkdown text={content} variant="memory" />
      </div>
    </article>
  )
}
