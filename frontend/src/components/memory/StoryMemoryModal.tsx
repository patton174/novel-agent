import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AgentMarkdown } from '../agent/AgentMarkdown'
import { MotionSegmentRail } from '../motion/MotionSegmentRail'
import { MotionPane } from '../motion/MotionPane'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogTitle } from '@/components/ui/dialog'
import type {
  MemoryTabId,
  NormalizedStoryMemory,
  StoryMemoryField,
  StoryMemoryGroup,
} from '../../types/storyMemory'
import {
  characterPreview,
  countTabEntries,
  isBodyOnlyGroup,
} from '../../utils/storyMemoryModel'
import {
  MEMORY_EMPTY_STATE,
  MEMORY_ENTRY_BODY,
  MEMORY_ENTRY_KEY,
  MEMORY_ENTRY_LIST,
  MEMORY_GROUP_CARD,
  MEMORY_GROUP_HEADER,
  MEMORY_GROUP_META,
  MEMORY_GROUP_SUMMARY,
  MEMORY_GROUP_TITLE,
  MEMORY_PLAIN_VALUE,
  MEMORY_ROLE_BADGE,
  memoryEntryCardClass,
} from '@/lib/storyMemoryModalClasses'

export type { MemoryTabId } from '../../types/storyMemory'

export interface StoryMemoryModalProps {
  open: boolean
  onClose: () => void
  memory: NormalizedStoryMemory
  activeTab: MemoryTabId
  onTabChange: (tab: MemoryTabId) => void
  updatedAt: Date | null
}

function useMemoryTabs() {
  const { t } = useTranslation(['editor'])
  return useMemo(
    (): { id: MemoryTabId; label: string; hint: string; emptyLabel: string }[] => [
      {
        id: 'novel',
        label: t('editor:memory.tabNovel'),
        hint: t('editor:memory.tabNovelHint'),
        emptyLabel: t('editor:memory.emptyNovel'),
      },
      {
        id: 'world',
        label: t('editor:memory.tabWorld'),
        hint: t('editor:memory.tabWorldHint'),
        emptyLabel: t('editor:memory.emptyWorld'),
      },
      {
        id: 'characters',
        label: t('editor:memory.tabCharacters'),
        hint: t('editor:memory.tabCharactersHint'),
        emptyLabel: t('editor:memory.emptyCharacters'),
      },
      {
        id: 'background',
        label: t('editor:memory.tabBackground'),
        hint: t('editor:memory.tabBackgroundHint'),
        emptyLabel: t('editor:memory.emptyBackground'),
      },
      {
        id: 'chapters',
        label: t('editor:memory.tabChapters'),
        hint: t('editor:memory.tabChaptersHint'),
        emptyLabel: t('editor:memory.emptyChapters'),
      },
    ],
    [t],
  )
}

function MemoryFieldBody({ field }: { field: StoryMemoryField }) {
  if (field.format === 'plain') {
    return <div className={MEMORY_PLAIN_VALUE}>{field.value}</div>
  }
  return <AgentMarkdown text={field.value} variant="memory" />
}

function GroupEntries({
  groups,
  emptyLabel,
  character,
}: {
  groups: StoryMemoryGroup[]
  emptyLabel: string
  character: boolean
}) {
  if (groups.length === 0) {
    return <div className={MEMORY_EMPTY_STATE}>{emptyLabel}</div>
  }
  return (
    <div className={MEMORY_ENTRY_LIST}>
      {groups.map((group) => {
        const preview = character ? characterPreview(group) : null
        const bodyOnly = !character && isBodyOnlyGroup(group)
        return (
          <div key={group.id} className={MEMORY_GROUP_CARD}>
            <div className={MEMORY_GROUP_HEADER}>
              <div className={MEMORY_GROUP_TITLE}>{group.displayTitle?.trim() || group.id}</div>
              {preview ? (
                <div className={MEMORY_GROUP_META}>
                  <span className={MEMORY_ROLE_BADGE}>{preview.roleLabel}</span>
                  <div className={MEMORY_GROUP_SUMMARY}>{preview.summary}</div>
                </div>
              ) : null}
            </div>
            {bodyOnly ? (
              <div className={MEMORY_ENTRY_BODY}>
                <MemoryFieldBody field={group.fields[0]} />
              </div>
            ) : (
              group.fields.map((field) => (
                <div key={`${group.id}-${field.key}`} className={memoryEntryCardClass(true)}>
                  <div className={MEMORY_ENTRY_KEY}>{field.key}</div>
                  <div className={MEMORY_ENTRY_BODY}>
                    <MemoryFieldBody field={field} />
                  </div>
                </div>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

export function StoryMemoryModal({
  open,
  onClose,
  memory,
  activeTab,
  onTabChange,
  updatedAt,
}: StoryMemoryModalProps) {
  const { t } = useTranslation(['editor'])
  const tabs = useMemoryTabs()
  const activeMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]

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
      bodyClassName="grid min-h-0 grid-cols-1 overflow-hidden p-0 max-[720px]:grid-rows-[auto_1fr] min-[721px]:grid-cols-[168px_1fr]"
    >
      <div className="flex flex-col gap-1.5 border-border/60 bg-muted/20 p-3.5 max-[720px]:flex-row max-[720px]:overflow-x-auto max-[720px]:border-b min-[721px]:border-r">
        <MotionSegmentRail
          items={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            trailing: countTabEntries(memory, tab.id),
          }))}
          activeId={activeTab}
          onChange={onTabChange}
          aria-label={t('editor:memory.tabsAria')}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MotionPane paneKey={activeTab}>
          <div className="px-4 pb-2 pt-3.5">
            <h3 className="m-0 text-[15px] font-bold text-foreground">{activeMeta.label}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{activeMeta.hint}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border">
            {activeTab === 'novel' && (
              <GroupEntries groups={memory.novel} emptyLabel={activeMeta.emptyLabel} character={false} />
            )}
            {activeTab === 'world' && (
              <GroupEntries groups={memory.world} emptyLabel={activeMeta.emptyLabel} character={false} />
            )}
            {activeTab === 'background' && (
              <GroupEntries groups={memory.background} emptyLabel={activeMeta.emptyLabel} character={false} />
            )}
            {activeTab === 'characters' && (
              <GroupEntries groups={memory.characters} emptyLabel={activeMeta.emptyLabel} character />
            )}
            {activeTab === 'chapters' && (
              <GroupEntries groups={memory.chapters} emptyLabel={activeMeta.emptyLabel} character={false} />
            )}
          </div>
        </MotionPane>
      </div>
    </AppModalShell>
  )
}
