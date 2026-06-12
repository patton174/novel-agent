import styled, { css } from 'styled-components'

import { ChapterInlineDiff } from './ChapterInlineDiff'

import { ChapterVersionPanel } from '../novel/ChapterVersionPanel'

import { NovelOutlinePanel } from '../novel/NovelOutlinePanel'

import { EditorButton } from '../ui/EditorButton'
import { confirmAction } from '../../stores/confirmDialogStore'

import { editorTheme } from '../../styles/editorTheme'

import { hideScrollbarCss, palette } from '../../styles/theme'

import { EditorIcons } from './icons'

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

    <StorySection>

      <StoryLayout>

        {!outlineCollapsed ? (
          <OutlineBackdrop
            type="button"
            aria-label="关闭章节目录"
            onClick={() => onOutlineCollapsedChange(true)}
          />
        ) : null}

        <StoryOutlineAside $collapsed={outlineCollapsed}>

          {outlineCollapsed ? (

            <CollapsedRail>

              <EditorButton

                variant="toggle"

                type="button"

                title="展开章节目录"

                onClick={() => onOutlineCollapsedChange(false)}

              >

                <EditorIcons.List />

              </EditorButton>

            </CollapsedRail>

          ) : (

            <>

              <OutlineHeader>

                <OutlineToggle

                  type="button"

                  title="收起章节目录"

                  onClick={() => onOutlineCollapsedChange(true)}

                >

                  <EditorIcons.List />

                  <span>章节目录</span>

                </OutlineToggle>

              </OutlineHeader>

              <OutlineScroll>

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

              </OutlineScroll>

            </>

          )}

        </StoryOutlineAside>

        <StoryEditorColumn>

          <StoryToolbar>

            <StoryTitle>

              {toolbarTitle}

              {chapterDirty ? ' · 未保存' : ''}

            </StoryTitle>

            <StoryActions>

              <EditorButton variant="secondary" size="sm" onClick={onCopyChapter}>

                <EditorIcons.Copy /><span>复制</span>

              </EditorButton>

              <EditorButton variant="primary" size="sm" onClick={onSaveChapter} disabled={!canSave}>

                <EditorIcons.Save /><span>保存</span>

              </EditorButton>

            </StoryActions>

          </StoryToolbar>

          {agentChapterStreaming ? (

            <StreamBanner role="status" aria-live="polite">

              <StreamBannerLabel>{streamStatusLabel}</StreamBannerLabel>

              {agentChapterStreamCharCount > 0 ? (

                <StreamBannerMeta>{agentChapterStreamCharCount} 字</StreamBannerMeta>

              ) : null}

            </StreamBanner>

          ) : null}

          <StoryContent>

            {!hasNovel ? (

              <StoryPlaceholder>请先创建或选择一本小说</StoryPlaceholder>

            ) : !hasChapter ? (

              <StoryPlaceholder>打开章节目录，选择或新建章节后开始写作</StoryPlaceholder>

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

              <ChapterEditor

                value={chapterContent}

                onChange={(e) => onChapterContentChange(e.target.value)}

                placeholder="在此撰写章节正文，AI 续写也会写入当前章节…"

                readOnly={agentChapterStreaming}

                $streaming={agentChapterStreaming}

              />

            )}

          </StoryContent>

        </StoryEditorColumn>

      </StoryLayout>

    </StorySection>

  )

}



const StorySection = styled.section`

  flex: 1;

  display: flex;

  flex-direction: column;

  min-height: 0;

  background: ${editorTheme.bg};

  overflow: hidden;

  animation: centerSwitchIn 0.22s ease both;



  @keyframes centerSwitchIn {

    from { opacity: 0; transform: translateY(4px); }

    to { opacity: 1; transform: translateY(0); }

  }

`



const StoryLayout = styled.div`

  flex: 1;

  display: flex;

  min-height: 0;

  overflow: hidden;

  position: relative;

`



const OutlineBackdrop = styled.button`

  display: none;

  @media (max-width: 767px) {

    display: block;

    position: absolute;

    inset: 0;

    z-index: 20;

    border: none;

    padding: 0;

    background: rgba(15, 23, 42, 0.38);

    cursor: pointer;

  }

`



const StoryOutlineAside = styled.aside<{ $collapsed: boolean }>`

  width: ${({ $collapsed }) => ($collapsed ? '52px' : '280px')};

  flex-shrink: 0;

  display: flex;

  flex-direction: column;

  min-height: 0;

  background: ${palette.bgSidebar};

  border-right: 1px solid rgba(0, 0, 0, 0.06);

  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.35);

  transition: width 0.32s cubic-bezier(0.4, 0, 0.2, 1);

  overflow: hidden;

  @media (max-width: 767px) {

    ${({ $collapsed }) =>
      !$collapsed &&
      css`
        position: absolute;
        z-index: 24;
        left: 0;
        top: 0;
        bottom: 0;
        width: min(280px, 88vw);
        box-shadow: 4px 0 24px rgba(15, 23, 42, 0.14);
      `}
  }

`



const CollapsedRail = styled.div`

  flex: 1;

  display: flex;

  align-items: flex-start;

  justify-content: center;

  padding: 0.75rem 0 0;

  box-sizing: border-box;

`



const OutlineHeader = styled.div`

  display: flex;

  align-items: center;

  padding: 0.7rem 0.75rem;

  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

`



const OutlineToggle = styled.button`

  display: inline-flex;

  align-items: center;

  gap: 0.45rem;

  padding: 0.25rem 0.35rem;

  margin: 0;

  border: none;

  border-radius: 8px;

  background: transparent;

  font: inherit;

  font-size: 0.82rem;

  font-weight: 700;

  color: ${palette.proseMuted};

  cursor: pointer;



  svg {

    width: 15px;

    height: 15px;

  }



  &:hover {

    background: ${editorTheme.accentMuted};

    color: ${editorTheme.text};

  }

`



const OutlineScroll = styled.div`

  flex: 1;

  overflow-y: auto;

  padding: 0.65rem 0.75rem 0.85rem;

  min-height: 0;

  ${hideScrollbarCss}

`



const StoryEditorColumn = styled.div`

  flex: 1;

  min-width: 0;

  display: flex;

  flex-direction: column;

  min-height: 0;

`



const StoryToolbar = styled.div`

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 0.75rem;

  padding: 0.75rem 1.5rem;

  background: ${editorTheme.bg};

  border-top: 1px solid rgba(0, 0, 0, 0.05);

  @media (max-width: 767px) {

    flex-wrap: wrap;

    padding: 0.65rem 1rem;

  }

`



const StoryTitle = styled.span`

  font-size: 0.9rem;

  font-weight: 700;

  color: ${editorTheme.text};

  min-width: 0;

  flex: 1;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  @media (max-width: 767px) {

    flex-basis: 100%;

  }

`



const StoryActions = styled.div`

  display: flex;

  gap: 0.5rem;

  flex-shrink: 0;

  @media (max-width: 767px) {

    margin-left: auto;

  }

`



const StoryContent = styled.div`

  flex: 1;

  overflow-y: auto;

  padding: 1.5rem;

  background: ${editorTheme.bg};

  ${hideScrollbarCss}

  @media (max-width: 767px) {

    padding: 1rem;

  }

`



const ChapterEditor = styled.textarea<{ $streaming?: boolean }>`

  width: 100%;

  min-height: 100%;

  border: none;

  resize: none;

  background: transparent;

  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif;

  font-size: 1.05rem;

  line-height: 2;

  letter-spacing: 0.04em;

  color: ${editorTheme.text};

  outline: none;

  white-space: pre-wrap;

  @media (max-width: 767px) {

    font-size: 1rem;

    line-height: 1.85;

    padding: 0;

  }

  ${({ $streaming }) =>

    $streaming

      ? `

    caret-color: ${palette.accent};

  `

      : ''}

`



const StreamBanner = styled.div`

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 0.75rem;

  padding: 0.45rem 1.5rem;

  background: ${palette.accentSoft};

  border-bottom: 1px solid ${palette.accentMuted};

  font-size: 0.78rem;

  color: ${palette.accentDeep};

`



const StreamBannerLabel = styled.span`

  font-weight: 600;

`



const StreamBannerMeta = styled.span`

  color: ${palette.textMuted};

  font-variant-numeric: tabular-nums;

`



const StoryPlaceholder = styled.div`

  color: ${palette.textMuted};

  font-size: 0.95rem;

  text-align: center;

  padding: 3rem 1rem;

`

