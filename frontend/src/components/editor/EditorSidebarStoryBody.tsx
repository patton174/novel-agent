import { useTranslation } from 'react-i18next'
import { NovelOutlinePanel } from '../novel/NovelOutlinePanel'
import { ChapterVersionPanel } from '../novel/ChapterVersionPanel'
import type { EditorSidebarStorySectionProps } from './editorSidebarTypes'
import { cn } from '@/lib/utils'

type StoryBodyVariant = 'desktop' | 'mobile'

export function EditorSidebarStoryBody({
  variant,
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
}: EditorSidebarStorySectionProps & { variant: StoryBodyVariant }) {
  const { t } = useTranslation(['editor'])

  if (!hasNovel) {
    return (
      <div className="px-2 py-3 font-mono text-xs leading-snug text-muted-foreground">
        {t('editor:story.emptyNovelDesktop')}
      </div>
    )
  }

  const versionPaneClass =
    variant === 'mobile'
      ? 'min-h-[168px] max-h-[44%]'
      : 'min-h-[148px] max-h-[36%]'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <NovelOutlinePanel
          reindexing={reindexing}
          reindexProgress={reindexProgress}
          onReindex={onReindex}
        />
      </div>

      <div className="mx-2 shrink-0 border-t-2 border-foreground/25" role="separator" />

      <div
        className={cn(
          'shrink-0 overflow-y-auto px-1.5 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          versionPaneClass,
        )}
      >
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
