import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MotionPane } from '../motion/MotionPane'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogTitle } from '@/components/ui/dialog'
import { NavAccordion, type NavAccordionItem } from '@/components/ui/NavAccordion'
import type { MemoryNodeDTO, MemoryRootTab, MemoryScope, MemoryTreeResponse } from '../../types/memoryNode'
import { MemoryNodeIcon } from './memoryNodeIcons'
import { MemoryContentPanel } from './MemoryContentPanel'

export interface StoryMemoryModalProps {
  open: boolean
  onClose: () => void
  memoryTabs: MemoryRootTab[]
  memoryTrees: Partial<Record<MemoryScope, MemoryTreeResponse>>
  memoryNodesByScope: Partial<Record<MemoryScope, Record<string, MemoryNodeDTO>>>
  activeScope: MemoryScope | null
  onScopeChange: (scope: MemoryScope) => void
  updatedAt: Date | null
}

export function StoryMemoryModal({
  open,
  onClose,
  memoryTabs,
  memoryTrees,
  memoryNodesByScope,
  activeScope,
  onScopeChange,
  updatedAt,
}: StoryMemoryModalProps) {
  const { t } = useTranslation(['editor'])
  const [expandedScope, setExpandedScope] = useState<string | null>(activeScope)
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null)

  const accordionItems = useMemo((): NavAccordionItem[] => {
    return memoryTabs.map((tab) => {
      const tree = memoryTrees[tab.scope]
      const root = tree?.nodes?.[0]
      const nodesById = memoryNodesByScope[tab.scope] ?? {}
      const children = [...(root?.children ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      const rootDetail = root ? nodesById[root.memory_id] : undefined

      return {
        id: tab.scope,
        label: tab.label,
        icon: tab.icon ? <MemoryNodeIcon name={tab.icon} className="size-3.5" /> : undefined,
        trailing: tab.count > 0 ? tab.count : undefined,
        leaves:
          children.length > 0
            ? children.map((child) => {
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
            : root
              ? [
                  {
                    id: root.memory_id,
                    label: (
                      <span className="flex min-w-0 items-center gap-1.5">
                        {rootDetail?.style?.icon ? (
                          <MemoryNodeIcon name={String(rootDetail.style.icon)} className="size-3.5 shrink-0" />
                        ) : null}
                        <span className="truncate">{root.title}</span>
                      </span>
                    ),
                  },
                ]
              : [],
      }
    })
  }, [memoryTabs, memoryTrees, memoryNodesByScope])

  const resolvedScope = activeScope ?? memoryTabs[0]?.scope ?? null

  useEffect(() => {
    if (!open || !resolvedScope) return
    const tree = memoryTrees[resolvedScope]
    const root = tree?.nodes?.[0]
    const children = root?.children ?? []
    const firstId = children.length > 0 ? children[0].memory_id : root?.memory_id ?? null
    setExpandedScope(resolvedScope)
    setActiveMemoryId((prev) => {
      if (prev && memoryNodesByScope[resolvedScope]?.[prev]) return prev
      return firstId
    })
  }, [open, resolvedScope, memoryTrees, memoryNodesByScope])

  const activeDetail = useMemo(() => {
    if (!activeMemoryId || !resolvedScope) return undefined
    return memoryNodesByScope[resolvedScope]?.[activeMemoryId]
  }, [activeMemoryId, memoryNodesByScope, resolvedScope])

  const handleLeafSelect = (scopeId: string, leafId: string) => {
    onScopeChange(scopeId)
    setExpandedScope(scopeId)
    setActiveMemoryId(leafId)
  }

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="memory"
      header={
        <div className="border-b border-border/60 px-4 pb-3 pt-1 max-md:px-3">
          <DialogTitle className="m-0 text-[17px] font-bold text-foreground">
            {t('editor:memory.title')}
          </DialogTitle>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {updatedAt
              ? t('editor:memory.readonlyUpdated', { time: updatedAt.toLocaleTimeString() })
              : t('editor:memory.readonly')}
          </p>
        </div>
      }
      bodyClassName="grid min-h-0 grid-cols-1 overflow-hidden p-0 max-md:grid-rows-[auto_minmax(200px,1fr)] min-[721px]:grid-cols-[minmax(200px,240px)_1fr]"
    >
      <div className="min-h-0 overflow-y-auto border-border/60 bg-sidebar/30 p-3 max-md:border-b min-[721px]:border-r">
        {accordionItems.length > 0 ? (
          <NavAccordion
            items={accordionItems}
            expandedId={expandedScope ?? resolvedScope}
            onExpandedChange={setExpandedScope}
            activeLeafId={activeMemoryId}
            onLeafSelect={handleLeafSelect}
            aria-label={t('editor:memory.navAria')}
          />
        ) : (
          <p className="px-1 text-[12px] text-muted-foreground">{t('editor:memory.emptyRoots')}</p>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MotionPane paneKey={activeMemoryId ?? resolvedScope ?? 'empty'}>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4 pt-3.5 sm:px-4">
            {activeDetail ? (
              <MemoryContentPanel
                detail={activeDetail}
                scope={resolvedScope ?? undefined}
                emptyContentTitle={t('editor:memory.emptyContentTitle')}
                emptyContentDescription={t('editor:memory.emptyContentDescription')}
              />
            ) : (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                {t('editor:memory.pickEntry')}
              </p>
            )}
          </div>
        </MotionPane>
      </div>
    </AppModalShell>
  )
}
