import { AgentMarkdown } from '../agent/AgentMarkdown'
import { EditorButton } from '../ui/EditorButton'
import { MotionSegmentRail } from '../motion/MotionSegmentRail'
import { MotionPane } from '../motion/MotionPane'
import {
  EditorModalBody,
  EditorModalHeader,
  EditorModalOverlay,
  EditorModalPanel,
  useEditorModalEscape,
} from '../editor/EditorModalShell'
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

const TABS: { id: MemoryTabId; label: string; hint: string }[] = [
  { id: 'novel', label: '大纲', hint: '小说定位、主线与创作规划' },
  { id: 'world', label: '世界观', hint: '时代、规则、势力与设定' },
  { id: 'characters', label: '角色库', hint: '人物弧线、关系与性格' },
  { id: 'background', label: '背景', hint: '历史、地理与文化背景' },
  { id: 'chapters', label: '章节记忆', hint: '伏笔、章节约束与剧情节点' },
]

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
  useEditorModalEscape(open, onClose)

  if (!open) return null

  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  return (
    <EditorModalOverlay onClick={onClose} role="presentation">
      <EditorModalPanel
        size="memory"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <EditorModalHeader>
          <div className="min-w-0 flex-1">
            <h2 id="memory-modal-title" className="m-0 text-[17px] font-bold text-foreground">
              记忆管理
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              只读展示{updatedAt ? ` · 更新于 ${updatedAt.toLocaleTimeString()}` : ''}
            </p>
          </div>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </EditorModalHeader>

        <EditorModalBody className="grid min-h-0 grid-cols-1 max-[720px]:grid-rows-[auto_1fr] min-[721px]:grid-cols-[168px_1fr]">
          <div className="flex flex-col gap-1.5 border-border/60 bg-muted/20 p-3.5 max-[720px]:flex-row max-[720px]:overflow-x-auto max-[720px]:border-b min-[721px]:border-r">
            <MotionSegmentRail
              items={TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                trailing: countTabEntries(memory, tab.id),
              }))}
              activeId={activeTab}
              onChange={onTabChange}
              aria-label="记忆分类"
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
                  <GroupEntries
                    groups={memory.novel}
                    emptyLabel="暂无大纲或小说级规划"
                    character={false}
                  />
                )}
                {activeTab === 'world' && (
                  <GroupEntries
                    groups={memory.world}
                    emptyLabel="暂无世界观设定"
                    character={false}
                  />
                )}
                {activeTab === 'background' && (
                  <GroupEntries
                    groups={memory.background}
                    emptyLabel="暂无背景设定"
                    character={false}
                  />
                )}
                {activeTab === 'characters' && (
                  <GroupEntries
                    groups={memory.characters}
                    emptyLabel="暂无角色记录"
                    character
                  />
                )}
                {activeTab === 'chapters' && (
                  <GroupEntries
                    groups={memory.chapters}
                    emptyLabel="暂无章节记忆"
                    character={false}
                  />
                )}
              </div>
            </MotionPane>
          </div>
        </EditorModalBody>
      </EditorModalPanel>
    </EditorModalOverlay>
  )
}
