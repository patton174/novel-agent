import { ChapterInlineDiff } from './ChapterInlineDiff'
import { ChapterVersionPanel } from '../novel/ChapterVersionPanel'
import { StoryMobileChapterPicker } from './StoryMobileChapterPicker'
import { EditorButton } from '../ui/EditorButton'
import { confirmAction } from '../../stores/appDialog'
import { EditorIcons } from './icons'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { ChapterStreamViewer } from './ChapterStreamViewer'
import type { ChapterVersion } from '../../types/novel'
import { useRef, type ChangeEvent } from 'react'
import { exportChapterContent, importChapterFromFile } from '../../utils/chapterImportExport'

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
  agentChapterStreamTitle?: string
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

function StoryToolbarActions({
  t,
  chapterDirty,
  canSave,
  toolbarTitle,
  chapterContent,
  onCopyChapter,
  onSaveChapter,
  onChapterContentChange,
}: {
  t: (key: string) => string
  chapterDirty: boolean
  canSave: boolean
  toolbarTitle: string
  chapterContent: string
  onCopyChapter: () => void
  onSaveChapter: () => void
  onChapterContentChange: (content: string) => void
}) {
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const parsed = await importChapterFromFile(file)
    if (parsed.content) {
      onChapterContentChange(parsed.content)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.md,.markdown,.json"
        className="hidden"
        onChange={(event) => void handleImport(event)}
      />
      <EditorButton
        variant="icon"
        size="sm"
        className="size-8 px-0 [&_svg]:size-[15px]"
        title={t('editor:story.import')}
        aria-label={t('editor:story.import')}
        onClick={() => importInputRef.current?.click()}
      >
        <EditorIcons.Upload />
      </EditorButton>
      <EditorButton
        variant="icon"
        size="sm"
        className="size-8 px-0 [&_svg]:size-[15px]"
        title={t('editor:story.export')}
        aria-label={t('editor:story.export')}
        onClick={() => exportChapterContent(toolbarTitle, chapterContent, 'md')}
      >
        <EditorIcons.Download />
      </EditorButton>
      <EditorButton
        variant="secondary"
        size="sm"
        className="size-8 px-0 [&_svg]:size-[15px]"
        title={t('editor:story.copy')}
        aria-label={t('editor:story.copy')}
        onClick={onCopyChapter}
      >
        <EditorIcons.Copy />
      </EditorButton>
      <EditorButton
        variant="primary"
        size="sm"
        className="size-8 px-0 [&_svg]:size-[15px]"
        title={`${t('editor:story.save')}${chapterDirty ? t('editor:story.unsaved') : ''}`}
        aria-label={t('editor:story.save')}
        onClick={onSaveChapter}
        disabled={!canSave}
      >
        <EditorIcons.Save />
      </EditorButton>
    </div>
  )
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
  agentChapterStreamTitle = '',
  activeChapterId,
  activeChapterTitle,
  chapterContent,
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
  const storyScrollRef = useRef<HTMLDivElement>(null)
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
          <StoryToolbarActions
            t={t}
            chapterDirty={chapterDirty}
            canSave={canSave}
            toolbarTitle={toolbarTitle}
            chapterContent={chapterContent}
            onCopyChapter={onCopyChapter}
            onSaveChapter={onSaveChapter}
            onChapterContentChange={onChapterContentChange}
          />
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

        <div ref={storyScrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background p-3">
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
          ) : agentChapterStreaming ? (
            <ChapterStreamViewer
              content={chapterContent}
              streaming={agentChapterStreamPhase === 'generating'}
              streamKey={agentChapterStreamTitle || activeChapterId || 'chapter-stream'}
              scrollRootRef={storyScrollRef}
              className="min-h-[40vh]"
            />
          ) : (
            <>
              <textarea
                value={chapterContent}
                onChange={(e) => onChapterContentChange(e.target.value)}
                placeholder={t('editor:story.editorPlaceholder')}
                className="min-h-[40vh] w-full resize-none border-none bg-transparent font-serif text-base leading-[1.85] tracking-wide text-foreground outline-none whitespace-pre-wrap"
              />
              {hasChapter ? (
                <ChapterVersionPanel
                  chapterId={activeChapterId}
                  currentTitle={activeChapterTitle}
                  currentContent={chapterContent}
                  onRestored={onChapterRestored}
                  previewVersionId={versionPreview?.id ?? null}
                  onPreviewVersion={onVersionPreviewChange}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function EditorStoryPanelDesktop({
  activeChapterId,
  chapterContent,
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
  agentChapterStreamTitle = '',
  onChapterContentChange,
  chapterDiffActive,
  chapterDiffBaseline,
  onAcceptChapterDiff,
  onDismissChapterDiff,
}: EditorStoryPanelProps) {
  const { t } = useTranslation(['editor'])
  const storyScrollRef = useRef<HTMLDivElement>(null)
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
      <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background px-6 py-3">
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-foreground">
          {toolbarTitle}
          {chapterDirty ? t('editor:story.unsaved') : ''}
        </span>
        <StoryToolbarActions
          t={t}
          chapterDirty={chapterDirty}
          canSave={canSave}
          toolbarTitle={toolbarTitle}
          chapterContent={chapterContent}
          onCopyChapter={onCopyChapter}
          onSaveChapter={onSaveChapter}
          onChapterContentChange={onChapterContentChange}
        />
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

      <div ref={storyScrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
        ) : agentChapterStreaming ? (
          <ChapterStreamViewer
            content={chapterContent}
            streaming={agentChapterStreamPhase === 'generating'}
            streamKey={agentChapterStreamTitle || activeChapterId || 'chapter-stream'}
            scrollRootRef={storyScrollRef}
          />
        ) : (
          <textarea
            value={chapterContent}
            onChange={(e) => onChapterContentChange(e.target.value)}
            placeholder={t('editor:story.editorPlaceholder')}
            className="min-h-full w-full resize-none border-none bg-transparent font-serif text-[1.05rem] leading-loose tracking-wide text-foreground outline-none whitespace-pre-wrap"
          />
        )}
      </div>
    </section>
  )
}
