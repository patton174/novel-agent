import { ChapterInlineDiff } from './ChapterInlineDiff'
import { ChapterVersionPanel } from '../novel/ChapterVersionPanel'
import { NovelOutlinePanel } from '../novel/NovelOutlinePanel'
import { StoryMobileChapterPicker } from './StoryMobileChapterPicker'
import { EditorButton } from '../ui/EditorButton'
import { confirmAction } from '../../stores/appDialog'
import { EditorIcons } from './icons'
import { useAppMobile } from '@/hooks/useMediaQuery'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { ChapterVersion } from '../../types/novel'

import { useTranslation } from 'react-i18next'

export interface EditorStoryPanelProps {
  outlineCollapsed: boolean
  onOutlineCollapsedChange: (collapsed: boolean) => void
  reindexing: boolean
  reindexProgress: { processed: number; chapters: number; indexed: number } | null
  onReindex: () => void
  activeChapterId: string | null
  activeChapterTitle: string
  chapterContent: string
  versionsExpanded: boolean
  onVersionsToggle: () => void
  onChapterRestored: () => void
  versionPreview: ChapterVersion | null
  onVersionPreviewChange: (version: ChapterVersion | null) => void
  toolbarTitle: string
  chapterDirty: boolean
  onCopyChapter: () => void
  onSaveChapter: () => void
  canSave: boolean
  hasNovel: boolean
  hasChapter: boolean
  agentChapterStreaming?: boolean
  agentChapterStreamPhase?: 'idle' | 'generating' | 'saving'
  agentChapterStreamCharCount?: number
  onChapterContentChange: (content: string) => void
  chapterDiffActive: boolean
  chapterDiffBaseline: string | null
  onAcceptChapterDiff: () => void
  onDismissChapterDiff: () => void
}

export function EditorStoryPanel(props: EditorStoryPanelProps) {
  const isMobile = useAppMobile()
  if (isMobile) {
    return <EditorStoryPanelMobile {...props} />
  }
  return <EditorStoryPanelDesktop {...props} />
}

function EditorStoryPanelMobile({
  toolbarTitle,
  chapterDirty,
  onCopyChapter,
  onSaveChapter,
  canSave,
  hasNovel,
  hasChapter,
  agentChapterStreaming = false,
  agentChapterStreamPhase = 'idle',
  agentChapterStreamCharCount = 0,
  activeChapterId,
  activeChapterTitle,
  chapterContent,
  versionsExpanded,
  onVersionsToggle,
  onChapterRestored,
  versionPreview,
  onVersionPreviewChange,
  onChapterContentChange,
  chapterDiffActive,
  chapterDiffBaseline,
  onAcceptChapterDiff,
  onDismissChapterDiff,
}: EditorStoryPanelProps) {
  const { t } = useTranslation(['editor'])
  const streamStatusLabel =
    agentChapterStreamPhase === 'saving' ? t('editor:story.savingToLibrary') : t('editor:story.generatingContent')

  const handleRestoreVersion = async () => {
    if (!activeChapterId || !versionPreview) return
    if (!(await confirmAction({
      title: t('editor:story.restoreVersionTitle'),
      description: t('editor:story.restoreVersionDesc'),
      confirmLabel: t('editor:story.restoreConfirm'),
    }))) return

    const { api } = await import('../../utils/api')
    await api.restoreChapterVersion(activeChapterId, versionPreview.id)
    onVersionPreviewChange(null)
    onChapterRestored()
  }

  const showVersionDiff = versionPreview != null && hasChapter
  const showAgentDiff =
    !showVersionDiff &&
    chapterDiffActive &&
    chapterDiffBaseline != null &&
    hasChapter &&
    !agentChapterStreaming

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {hasNovel ? <StoryMobileChapterPicker /> : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
            {toolbarTitle}
            {chapterDirty ? t('editor:story.unsaved') : ''}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {hasChapter ? (
              <EditorButton variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onVersionsToggle}>
                {t('editor:story.version')}
              </EditorButton>
            ) : null}
            <EditorButton variant="secondary" size="sm" className="h-8 px-2.5" onClick={onCopyChapter}>
              <EditorIcons.Copy />
            </EditorButton>
            <EditorButton variant="primary" size="sm" className="h-8 px-2.5" onClick={onSaveChapter} disabled={!canSave}>
              <EditorIcons.Save />
            </EditorButton>
          </div>
        </div>

        {agentChapterStreaming ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-3 border-b border-primary/10 bg-primary/5 px-3 py-1.5 text-xs text-primary"
          >
            <span className="font-semibold">{streamStatusLabel}</span>
            {agentChapterStreamCharCount > 0 ? (
              <span className="tabular-nums text-muted-foreground">
                {t('editor:story.wordCount', { count: agentChapterStreamCharCount })}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto bg-background p-3">
          {!hasNovel ? (
            <div className="px-2 py-10 text-center text-sm text-muted-foreground">
              {t('editor:story.emptyNovel')}
            </div>
          ) : !hasChapter ? (
            <div className="px-2 py-10 text-center text-sm text-muted-foreground">
              {t('editor:story.emptyChapter')}
            </div>
          ) : showVersionDiff ? (
            <ChapterInlineDiff
              baseline={chapterContent}
              current={versionPreview.content}
              title={t('editor:story.versionDiffTitle')}
              acceptLabel={t('editor:story.versionDiffAccept')}
              onAccept={() => void handleRestoreVersion()}
              onDismiss={() => onVersionPreviewChange(null)}
            />
          ) : showAgentDiff ? (
            <ChapterInlineDiff
              baseline={chapterDiffBaseline!}
              current={chapterContent}
              title={t('editor:story.agentDiffTitle')}
              acceptLabel={t('editor:story.agentDiffAccept')}
              onAccept={onAcceptChapterDiff}
              onDismiss={onDismissChapterDiff}
            />
          ) : (
            <textarea
              value={chapterContent}
              onChange={(e) => onChapterContentChange(e.target.value)}
              placeholder={t('editor:story.editorPlaceholder')}
              readOnly={agentChapterStreaming}
              className={cn(
                'min-h-full w-full resize-none border-none bg-transparent font-serif text-base leading-[1.85] tracking-wide text-foreground outline-none whitespace-pre-wrap',
                agentChapterStreaming && 'caret-primary',
              )}
            />
          )}
        </div>
      </div>

      <Sheet
        open={versionsExpanded}
        onOpenChange={(open) => {
          if (!open && versionsExpanded) onVersionsToggle()
        }}
      >
        <SheetContent side="bottom" className="max-h-[72vh] overflow-y-auto rounded-t-2xl px-4 pb-6">
          <SheetHeader className="px-0">
            <SheetTitle>{t('editor:story.chapterVersions')}</SheetTitle>
          </SheetHeader>
          <ChapterVersionPanel
            chapterId={activeChapterId}
            currentTitle={activeChapterTitle}
            currentContent={chapterContent}
            expanded
            onToggle={onVersionsToggle}
            onRestored={onChapterRestored}
            previewVersionId={versionPreview?.id ?? null}
            onPreviewVersion={onVersionPreviewChange}
          />
        </SheetContent>
      </Sheet>
    </section>
  )
}

function EditorStoryPanelDesktop({
  outlineCollapsed,
  onOutlineCollapsedChange,
  reindexing,
  reindexProgress,
  onReindex,
  activeChapterId,
  activeChapterTitle,
  chapterContent,
  versionsExpanded,
  onVersionsToggle,
  onChapterRestored,
  versionPreview,
  onVersionPreviewChange,
  toolbarTitle,
  chapterDirty,
  onCopyChapter,
  onSaveChapter,
  canSave,
  hasNovel,
  hasChapter,
  agentChapterStreaming = false,
  agentChapterStreamPhase = 'idle',
  agentChapterStreamCharCount = 0,
  onChapterContentChange,
  chapterDiffActive,
  chapterDiffBaseline,
  onAcceptChapterDiff,
  onDismissChapterDiff,
}: EditorStoryPanelProps) {
  const { t } = useTranslation(['editor'])
  const showVersionDiff = versionPreview != null && hasChapter
  const showAgentDiff =
    !showVersionDiff &&
    chapterDiffActive &&
    chapterDiffBaseline != null &&
    hasChapter &&
    !agentChapterStreaming

  const streamStatusLabel =
    agentChapterStreamPhase === 'saving'
      ? t('editor:story.savingToLibrary')
      : t('editor:story.generatingContent')

  const handleRestoreVersion = async () => {
    if (!activeChapterId || !versionPreview) return
    if (!(await confirmAction({
      title: t('editor:story.restoreVersionTitle'),
      description: t('editor:story.restoreVersionDesc'),
      confirmLabel: t('editor:story.restoreConfirm'),
    }))) return

    const { api } = await import('../../utils/api')
    await api.restoreChapterVersion(activeChapterId, versionPreview.id)
    onVersionPreviewChange(null)
    onChapterRestored()
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            'flex shrink-0 flex-col min-h-0 overflow-hidden border-r bg-muted/30 transition-[width] duration-300 ease-out',
            outlineCollapsed ? 'w-[52px]' : 'w-[280px]',
          )}
        >
          {outlineCollapsed ? (
            <div className="box-border flex flex-1 items-start justify-center pt-3">
              <EditorButton
                variant="toggle"
                type="button"
                title={t('editor:story.expandOutline')}
                onClick={() => onOutlineCollapsedChange(false)}
              >
                <EditorIcons.List />
              </EditorButton>
            </div>
          ) : (
            <>
              <div className="flex items-center border-b border-border/60 px-3 py-[0.7rem]">
                <button
                  type="button"
                  title={t('editor:story.collapseOutline')}
                  className="inline-flex cursor-pointer items-center gap-[0.45rem] rounded-lg border-none bg-transparent px-[0.35rem] py-1 font-[inherit] text-[0.82rem] font-bold text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-[15px]"
                  onClick={() => onOutlineCollapsedChange(true)}
                >
                  <EditorIcons.List />
                  <span>{t('editor:story.chapterOutline')}</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[0.85rem] pt-[0.65rem] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <NovelOutlinePanel
                  reindexing={reindexing}
                  reindexProgress={reindexProgress}
                  onReindex={onReindex}
                />
                <div className="my-3 border-t border-border/70" />
                <ChapterVersionPanel
                  chapterId={activeChapterId}
                  currentTitle={activeChapterTitle}
                  currentContent={chapterContent}
                  expanded={versionsExpanded}
                  onToggle={onVersionsToggle}
                  onRestored={onChapterRestored}
                  previewVersionId={versionPreview?.id ?? null}
                  onPreviewVersion={onVersionPreviewChange}
                />
              </div>
            </>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-t border-black/5 bg-background px-6 py-3">
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-foreground">
              {toolbarTitle}
              {chapterDirty ? t('editor:story.unsaved') : ''}
            </span>
            <div className="flex shrink-0 gap-2">
              <EditorButton variant="secondary" size="sm" onClick={onCopyChapter}>
                <EditorIcons.Copy />
                <span>{t('editor:story.copy')}</span>
              </EditorButton>
              <EditorButton variant="primary" size="sm" onClick={onSaveChapter} disabled={!canSave}>
                <EditorIcons.Save />
                <span>{t('editor:story.save')}</span>
              </EditorButton>
            </div>
          </div>

          {agentChapterStreaming ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-3 border-b border-primary/10 bg-primary/5 px-6 py-[0.45rem] text-[0.78rem] text-primary"
            >
              <span className="font-semibold">{streamStatusLabel}</span>
              {agentChapterStreamCharCount > 0 ? (
                <span className="tabular-nums text-muted-foreground">
                  {t('editor:story.wordCount', { count: agentChapterStreamCharCount })}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto bg-background p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {!hasNovel ? (
              <div className="px-4 py-12 text-center text-[0.95rem] text-muted-foreground">
                {t('editor:story.emptyNovelDesktop')}
              </div>
            ) : !hasChapter ? (
              <div className="px-4 py-12 text-center text-[0.95rem] text-muted-foreground">
                {t('editor:story.emptyChapterDesktop')}
              </div>
            ) : showVersionDiff ? (
              <ChapterInlineDiff
                baseline={chapterContent}
                current={versionPreview.content}
                title={t('editor:story.versionDiffTitle')}
                acceptLabel={t('editor:story.versionDiffAccept')}
                onAccept={() => void handleRestoreVersion()}
                onDismiss={() => onVersionPreviewChange(null)}
              />
            ) : showAgentDiff ? (
              <ChapterInlineDiff
                baseline={chapterDiffBaseline!}
                current={chapterContent}
                title={t('editor:story.agentDiffTitle')}
                acceptLabel={t('editor:story.agentDiffAccept')}
                onAccept={onAcceptChapterDiff}
                onDismiss={onDismissChapterDiff}
              />
            ) : (
              <textarea
                value={chapterContent}
                onChange={(e) => onChapterContentChange(e.target.value)}
                placeholder={t('editor:story.editorPlaceholder')}
                readOnly={agentChapterStreaming}
                className={cn(
                  'min-h-full w-full resize-none border-none bg-transparent font-serif text-[1.05rem] leading-loose tracking-wide text-foreground outline-none whitespace-pre-wrap',
                  agentChapterStreaming && 'caret-primary',
                )}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
