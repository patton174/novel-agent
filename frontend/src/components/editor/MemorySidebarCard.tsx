import { useTranslation } from 'react-i18next'

import type { MemoryRootTab } from '@/types/memoryNode'
import { SidebarInsightCard } from '@/components/ui/SidebarInsightCard'
import { EditorIcons } from './icons'

export interface MemorySidebarCardProps {
  tabs: MemoryRootTab[]
  active?: boolean
  onOpen: () => void
}

export function MemorySidebarCard({ tabs, active, onOpen }: MemorySidebarCardProps) {
  const { t } = useTranslation(['editor'])

  const scopeCount = tabs.length
  const entryCount = tabs.reduce((sum, tab) => sum + (tab.count > 0 ? tab.count : 0), 0)
  const subtitle =
    scopeCount === 0
      ? t('editor:memory.sidebarEmpty')
      : entryCount > 0
        ? t('editor:memory.sidebarSummary', { scopes: scopeCount, entries: entryCount })
        : t('editor:memory.sidebarScopesOnly', { count: scopeCount })

  return (
    <SidebarInsightCard
      data-testid="memory-sidebar-card"
      icon={
        <span className="text-muted-foreground [&_svg]:text-muted-foreground">
          <EditorIcons.Database />
        </span>
      }
      title={t('editor:memory.sidebarTitle')}
      subtitle={subtitle}
      active={active}
      onClick={onOpen}
    />
  )
}
