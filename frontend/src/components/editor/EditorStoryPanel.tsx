import { ChapterInlineDiff } from './ChapterInlineDiff'
import { ChapterVersionPanel } from '../novel/ChapterVersionPanel'
import { NovelOutlinePanel } from '../novel/NovelOutlinePanel'
import { EditorButton } from '../ui/EditorButton'
import { confirmAction } from '../../stores/confirmDialogStore'
import { EditorIcons } from './icons'
import { cn } from '@/lib/utils'
import type { ChapterVersion } from '../../types/novel'

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

export function EditorStoryPanel({
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
  const showVersionDiff = versionPreview != null && hasChapter
  const showAgentDiff =
    !showVersionDiff &&
    chapterDiffActive &&
    chapterDiffBaseline != null &&
    hasChapter &&
    !agentChapterStreaming

  const streamStatusLabel =
    agentChapterStreamPhase === 'saving'
      ? '正在保存到作品库…'
      : '正在生成正文…'

  const handleRestoreVersion = async () => {
    if (!activeChapterId || !versionPreview) return
    if (!(await confirmAction({
      title: '恢复版本',
      description: '确定恢复到该版本？当前正文会先保存为一个版本。',
      confirmLabel: '恢复',
    }))) return

    const { api } = await import('../../utils/api')
    await api.restoreChapterVersion(activeChapterId, versionPreview.id)
    onVersionPreviewChange(null)
    onChapterRestored()
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {!outlineCollapsed ? (
          <button
            type="button"
            aria-label="关闭章节目录"
            className="hidden max-md:block absolute inset-0 z-20 cursor-pointer border-0 bg-slate-900/40 p-0"
            onClick={() => onOutlineCollapsedChange(true)}
          />
        ) : null}

        <aside
          className={cn(
            'flex shrink-0 flex-col min-h-0 overflow-hidden border-r bg-muted/30 transition-[width] duration-300 ease-out',
            outlineCollapsed ? 'w-[52px]' : 'w-[280px]',
            !outlineCollapsed &&
              'max-md:absolute max-md:z-24 max-md:left-0 max-md:top-0 max-md:bottom-0 max-md:w-[min(280px,88vw)] max-md:shadow-lg',
          )}
        >
          {outlineCollapsed ? (
            <div className="box-border flex flex-1 items-start justify-center pt-3">
              <EditorButton
                variant="toggle"
                type="button"
                title="展开章节目录"
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
                  title="收起章节目录"
                  className="inline-flex cursor-pointer items-center gap-[0.45rem] rounded-lg border-none bg-transparent px-[0.35rem] py-1 font-[inherit] text-[0.82rem] font-bold text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-[15px]"
                  onClick={() => onOutlineCollapsedChange(true)}
                >
                  <EditorIcons.List />
                  <span>章节目录</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[0.85rem] pt-[0.65rem] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <NovelOutlinePanel
                  reindexing={reindexing}
                  reindexProgress={reindexProgress}
                  onReindex={onReindex}
                />
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
          <div className="flex items-center justify-between gap-3 border-t border-black/5 bg-background px-6 py-3 max-md:flex-nowrap max-md:px-4 max-md:py-[0.55rem]">
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-foreground">
              {toolbarTitle}
              {chapterDirty ? ' · 未保存' : ''}
            </span>
            <div className="flex shrink-0 gap-2">
              <EditorButton variant="secondary" size="sm" onClick={onCopyChapter}>
                <EditorIcons.Copy /><span>复制</span>
              </EditorButton>
              <EditorButton variant="primary" size="sm" onClick={onSaveChapter} disabled={!canSave}>
                <EditorIcons.Save /><span>保存</span>
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
                  {agentChapterStreamCharCount} 字
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto bg-background p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-md:p-4">
            {!hasNovel ? (
              <div className="px-4 py-12 text-center text-[0.95rem] text-muted-foreground">
                请先创建或选择一本小说
              </div>
            ) : !hasChapter ? (
              <div className="px-4 py-12 text-center text-[0.95rem] text-muted-foreground">
                打开章节目录，选择或新建章节后开始写作
              </div>
            ) : showVersionDiff ? (
              <ChapterInlineDiff
                baseline={chapterContent}
                current={versionPreview.content}
                title="历史版本预览（对比当前正文）"
                acceptLabel="恢复此版本"
                onAccept={() => void handleRestoreVersion()}
                onDismiss={() => onVersionPreviewChange(null)}
              />
            ) : showAgentDiff ? (
              <ChapterInlineDiff
                baseline={chapterDiffBaseline!}
                current={chapterContent}
                title="AI 修改预览（对比修改前正文）"
                acceptLabel="保留修改"
                onAccept={onAcceptChapterDiff}
                onDismiss={onDismissChapterDiff}
              />
            ) : (
              <textarea
                value={chapterContent}
                onChange={(e) => onChapterContentChange(e.target.value)}
                placeholder="在此撰写章节正文，AI 续写也会写入当前章节…"
                readOnly={agentChapterStreaming}
                className={cn(
                  'min-h-full w-full resize-none border-none bg-transparent font-serif text-[1.05rem] leading-loose tracking-wide text-foreground outline-none whitespace-pre-wrap max-md:p-0 max-md:text-base max-md:leading-[1.85]',
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
