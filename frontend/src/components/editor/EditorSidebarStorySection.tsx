import { useTranslation } from 'react-i18next'
import { NovelOutlinePanel } from '../novel/NovelOutlinePanel'
import { ChapterVersionPanel } from '../novel/ChapterVersionPanel'
import type { ChapterVersion } from '../../types/novel'

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

export function EditorSidebarStorySection({
  hasNovel,
  reindexing,
  reindexProgress,
  onReindex,
  activeChapterId,
  activeChapterTitle,
  chapterContent,
  onChapterRestored,
  versionPreview,
  onVersionPreviewChange,
}: EditorSidebarStorySectionProps) {
  const { t } = useTranslation(['editor'])

  if (!hasNovel) {
    return (
      <div className="px-1.5 py-2 text-xs leading-snug text-muted-foreground/80">
        {t('editor:story.emptyNovelDesktop')}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-1.5 pb-2">
      <div className="min-h-0 flex-[3] overflow-y-auto pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <NovelOutlinePanel
          reindexing={reindexing}
          reindexProgress={reindexProgress}
          onReindex={onReindex}
        />
      </div>
      <div className="mx-0.5 shrink-0 border-t border-border/60" role="separator" />
      <div className="min-h-0 flex-[1] overflow-y-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <ChapterVersionPanel
          chapterId={activeChapterId}
          currentTitle={activeChapterTitle}
          currentContent={chapterContent}
          onRestored={onChapterRestored}
          previewVersionId={versionPreview?.id ?? null}
          onPreviewVersion={onVersionPreviewChange}
        />
      </div>
    </div>
  )
}
