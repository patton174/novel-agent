import type { NovelSessionGroup } from '@/hooks/editor/useEditorSessions'
import type { MemoryRootTab } from '@/types/memoryNode'
import type { CreateNovelPayload, ChapterVersion } from '@/types/novel'
import type { EditorSidebarTab } from './EditorCenterTabs.types'

export interface EditorSidebarStorySectionProps {
  hasNovel: boolean
  reindexing: boolean
  reindexProgress: { processed: number; chapters: number; indexed: number } | null
  onReindex: () => void
  activeChapterId: string | null
  activeChapterTitle: string
  chapterContent: string
  onChapterRestored: () => void
  versionPreview: ChapterVersion | null
  onVersionPreviewChange: (version: ChapterVersion | null) => void
}

export interface EditorSidebarCommonProps {
  centerTab: EditorSidebarTab
  activeNovelId: string | null
  activeSession: string
  runningSessionId?: string | null
  novelSessionGroups: NovelSessionGroup[]
  expandedNovelIds: Set<string>
  titlePendingSessionIds: Set<string>
  onToggleNovelExpanded: (novelId: string) => void
  onSelectNovel: (novelId: string) => void
  onNewChatForNovel: (novelId: string) => void
  onDeleteNovel: (novelId: string) => Promise<void>
  onUpdateNovel: (novelId: string, payload: CreateNovelPayload) => Promise<void>
  onNewNovel: () => void
  onSwitchSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => void
  onDeleteSession: (sessionId: string) => void
  onOpenMemory: () => void
  onOpenSettings: () => void
  onOpenUserProfile: () => void
  onOpenAvatarEditor: () => void
  memoryModalOpen: boolean
  memoryTabs: MemoryRootTab[]
  storySection: EditorSidebarStorySectionProps
}
