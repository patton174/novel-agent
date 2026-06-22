import { ChapterInlineDiff } from './ChapterInlineDiff'
import { EditorButton } from '../ui/EditorButton'
import { confirmAction } from '../../stores/appDialog'
import { EditorIcons } from './icons'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { ChapterStreamViewer } from './ChapterStreamViewer'
import type { ChapterVersion } from '../../types/novel'
import { useRef, type ChangeEvent, type ReactNode } from 'react'
import { exportChapterContent, importChapterFromFile } from '../../utils/chapterImportExport'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_STORY_BODY, EDITOR_PIXEL_STORY_TOOLBAR, editorPixelIconButtonClass, editorPrimaryButtonClass, editorSecondaryButtonClass } from '@/lib/editorPixelClasses'

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
  /** 移动端底部 TabBar 占位（px） */
  mobileBottomInset?: number
}

export function EditorStoryPanel(props: EditorStoryPanelProps) {
  const isMobile = useAppMobile()
  if (isMobile) {
    return <EditorStoryPanelMobile {...props} />
  }
  return <EditorStoryPanelDesktop {...props} />
}

function StoryToolbarButton({
  showLabels,
  label,
  title,
  ariaLabel,
  onClick,
  disabled,
  primary,
  children,
}: {
  showLabels: boolean
  label: string
  title: string
  ariaLabel: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  children: ReactNode
}) {
  const iconOnlyClass = 'size-8 px-0 [&_svg]:size-[15px]'
  const labeledClass =
    'h-8 shrink-0 gap-1.5 px-2.5 py-1 normal-case [&_svg]:size-[14px]'

  return (
    <EditorButton
      variant={showLabels ? 'secondary' : 'icon'}
      size="sm"
      className={cn(
        showLabels
          ? primary
            ? editorPrimaryButtonClass(labeledClass)
            : editorSecondaryButtonClass(labeledClass)
          : cn(
              primary
                ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-primary/90 hover:text-primary-foreground'
                : editorPixelIconButtonClass(),
              iconOnlyClass,
            ),
      )}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {showLabels ? <span className="whitespace-nowrap">{label}</span> : null}
    </EditorButton>
  )
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
  showLabels = false,
}: {
  t: (key: string) => string
  chapterDirty: boolean
  canSave: boolean
  toolbarTitle: string
  chapterContent: string
  onCopyChapter: () => void
  onSaveChapter: () => void
  onChapterContentChange: (content: string) => void
  showLabels?: boolean
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
    <div className={cn('flex shrink-0 items-center', showLabels ? 'gap-1.5' : 'gap-1')}>
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.md,.markdown,.json"
        className="hidden"
        onChange={(event) => void handleImport(event)}
      />
      <StoryToolbarButton
        showLabels={showLabels}
        label={t('editor:story.importLabel')}
        title={t('editor:story.import')}
        ariaLabel={t('editor:story.import')}
        onClick={() => importInputRef.current?.click()}
      >
        <EditorIcons.Upload />
      </StoryToolbarButton>
      <StoryToolbarButton
        showLabels={showLabels}
        label={t('editor:story.exportLabel')}
        title={t('editor:story.export')}
        ariaLabel={t('editor:story.export')}
        onClick={() => exportChapterContent(toolbarTitle, chapterContent, 'md')}
      >
        <EditorIcons.Download />
      </StoryToolbarButton>
      <StoryToolbarButton
        showLabels={showLabels}
        label={t('editor:story.copy')}
        title={t('editor:story.copy')}
        ariaLabel={t('editor:story.copy')}
        onClick={onCopyChapter}
      >
        <EditorIcons.Copy />
      </StoryToolbarButton>
      <StoryToolbarButton
        showLabels={showLabels}
        label={t('editor:story.save')}
        title={`${t('editor:story.save')}${chapterDirty ? t('editor:story.unsaved') : ''}`}
        ariaLabel={t('editor:story.save')}
        onClick={onSaveChapter}
        disabled={!canSave}
        primary
      >
        <EditorIcons.Save />
      </StoryToolbarButton>
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
  activeChapterTitle: _activeChapterTitle,
  chapterContent,
  onChapterRestored,
  versionPreview,
  onVersionPreviewChange,
  onChapterContentChange,
  chapterDiffActive,
  chapterDiffBaseline,
  onAcceptChapterDiff,
  onDismissChapterDiff,
  mobileBottomInset = 0,
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
    <section className="flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
        <div className={cn(EDITOR_PIXEL_STORY_TOOLBAR, 'max-md:justify-between max-md:gap-2 max-md:px-2 justify-end')}>
          <span className="min-w-0 flex-1 truncate text-[0.85rem] font-bold leading-snug text-foreground max-md:block md:hidden">
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
            className="flex items-center justify-between gap-3 border-b-2 border-foreground bg-neon/15 px-3 py-1.5 font-mono text-xs font-bold uppercase text-foreground"
          >
            <span className="font-semibold">{streamStatusLabel}</span>
            {agentChapterStreamCharCount > 0 ? (
              <span className="tabular-nums text-muted-foreground">
                {t('editor:story.wordCount', { count: agentChapterStreamCharCount })}
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          ref={storyScrollRef}
          className="flex min-h-0 w-full max-w-full flex-1 flex-col overflow-y-auto bg-background px-3 py-2 max-md:px-0 max-md:py-0"
          style={{ paddingBottom: `calc(0.75rem + ${mobileBottomInset}px)` }}
        >
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
              className="min-h-[40vh] w-full max-w-full"
            />
          ) : (
            <textarea
              value={chapterContent}
              onChange={(e) => onChapterContentChange(e.target.value)}
              placeholder={t('editor:story.editorPlaceholder')}
              className={cn(
                EDITOR_PIXEL_STORY_BODY,
                'box-border block min-h-0 w-full max-w-none flex-1 self-stretch px-3 py-2 max-md:min-h-full max-md:px-3 max-md:py-2',
              )}
            />
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
      <div className={cn(EDITOR_PIXEL_STORY_TOOLBAR, 'justify-between px-6')}>
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
          showLabels
        />
      </div>

      {agentChapterStreaming ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 border-b-2 border-foreground bg-neon/15 px-6 py-[0.45rem] font-mono text-[0.78rem] font-bold uppercase text-foreground"
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
            className={EDITOR_PIXEL_STORY_BODY}
          />
        )}
      </div>
    </section>
  )
}
