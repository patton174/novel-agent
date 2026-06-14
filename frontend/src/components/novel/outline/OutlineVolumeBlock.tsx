import type { DragEvent } from 'react'
import type { ChapterSummary, Volume } from '../../../types/novel'
import { EditorButton } from '../../ui/EditorButton'
import { allowOutlineDrop } from './outlineDrag'
import { OutlineDragHandle } from './OutlineDragHandle'
import { outlineChapterDropProps, outlineVolumeDropProps } from './outlineTouchDom'
import { ChevronIcon, PlusIcon } from './outlineIcons'
import type { DragPayload, DropTarget } from './outlineTypes'
import {
  OUTLINE_CHAPTER_LIST_INNER,
  OUTLINE_CHAPTER_ROW,
  OUTLINE_VOLUME_HEADER,
  outlineChapterDropZoneClass,
  outlineChapterListCollapsibleClass,
  outlineChevronWrapClass,
  outlineItemClass,
  outlineVolumeBlockClass,
} from '@/lib/outlineClasses'

export interface OutlineVolumeBlockProps {
  volume: Volume
  volumeChapters: ChapterSummary[]
  expanded: boolean
  activeChapterId: string | null
  activeNovelId: string | null
  busy: boolean
  dragging: DragPayload | null
  dropTarget: DropTarget | null
  onToggleExpand: () => void
  onVolumeDragStart: (event: DragEvent, volumeId: string) => void
  onChapterDragStart: (event: DragEvent, chapterId: string) => void
  onDragEnd: () => void
  onVolumeDrop: (event: DragEvent, volumeId: string) => void
  onChapterDrop: (event: DragEvent, volumeId: string, beforeChapterId: string | null) => void
  onSetDropTarget: (target: DropTarget | null | ((current: DropTarget | null) => DropTarget | null)) => void
  onSelectChapter: (chapterId: string) => void
  onAddChapter: (title: string, volumeId: string) => void
  bindTouchHandle?: (payload: DragPayload, label: string) => {
    onTouchStart: (event: React.TouchEvent) => void
  }
}

export function OutlineVolumeBlock({
  volume,
  volumeChapters,
  expanded,
  activeChapterId,
  activeNovelId,
  busy,
  dragging,
  dropTarget,
  onToggleExpand,
  onVolumeDragStart,
  onChapterDragStart,
  onDragEnd,
  onVolumeDrop,
  onChapterDrop,
  onSetDropTarget,
  onSelectChapter,
  onAddChapter,
  bindTouchHandle,
}: OutlineVolumeBlockProps) {
  const volumeDropActive = dropTarget?.kind === 'volume' && dropTarget.volumeId === volume.id

  return (
    <div
      className={outlineVolumeBlockClass(volumeDropActive)}
      {...outlineVolumeDropProps(volume.id)}
      onDragOver={(event) => {
        if (dragging?.kind !== 'volume') return
        allowOutlineDrop(event)
        onSetDropTarget({ kind: 'volume', volumeId: volume.id })
      }}
      onDragLeave={() => {
        onSetDropTarget((current) =>
          current?.volumeId === volume.id && current.kind === 'volume' ? null : current,
        )
      }}
      onDrop={(event) => void onVolumeDrop(event, volume.id)}
    >
      <div className={OUTLINE_VOLUME_HEADER}>
        <OutlineDragHandle
          title="拖拽排序卷"
          disabled={busy}
          onDragStart={(event) => onVolumeDragStart(event, volume.id)}
          onDragEnd={onDragEnd}
          {...(bindTouchHandle?.({ kind: 'volume', id: volume.id }, volume.title) ?? {})}
        />
        <EditorButton variant="volume" type="button" onClick={onToggleExpand}>
          <span className="title">{volume.title}</span>
          <span className="meta">{volumeChapters.length} 章</span>
          <span className={outlineChevronWrapClass(expanded)}>
            <ChevronIcon />
          </span>
        </EditorButton>
      </div>
      <div className={outlineChapterListCollapsibleClass(expanded)}>
        <div className={OUTLINE_CHAPTER_LIST_INNER}>
          {volumeChapters.length === 0 ? (
            <div
              className={outlineChapterDropZoneClass(
                dropTarget?.volumeId === volume.id && dropTarget.kind === 'chapter',
              )}
              {...outlineChapterDropProps(volume.id, null)}
              onDragOver={(event) => {
                if (dragging?.kind !== 'chapter') return
                allowOutlineDrop(event)
                onSetDropTarget({ kind: 'chapter', volumeId: volume.id, chapterId: null })
              }}
              onDrop={(event) => void onChapterDrop(event, volume.id, null)}
            >
              拖拽章节到此处
            </div>
          ) : (
            volumeChapters.map((chapter, index) => {
              const chapterDropActive =
                dropTarget?.kind === 'chapter' &&
                dropTarget.volumeId === volume.id &&
                dropTarget.chapterId === chapter.id
              return (
                <div
                  key={chapter.id}
                  className={outlineItemClass({
                    active: chapter.id === activeChapterId,
                    inProgress: chapter.wordCount > 0 && chapter.id !== activeChapterId,
                    dragOver: chapterDropActive,
                  })}
                  {...outlineChapterDropProps(volume.id, chapter.id)}
                  onDragOver={(event) => {
                    if (dragging?.kind !== 'chapter') return
                    allowOutlineDrop(event)
                    onSetDropTarget({
                      kind: 'chapter',
                      volumeId: volume.id,
                      chapterId: chapter.id,
                    })
                  }}
                  onDragLeave={() => {
                    onSetDropTarget((current) =>
                      current?.chapterId === chapter.id ? null : current,
                    )
                  }}
                  onDrop={(event) => void onChapterDrop(event, volume.id, chapter.id)}
                >
                  <div className={OUTLINE_CHAPTER_ROW}>
                    <OutlineDragHandle
                      title="拖拽移动章节"
                      disabled={busy}
                      onDragStart={(event) => onChapterDragStart(event, chapter.id)}
                      onDragEnd={onDragEnd}
                      {...(bindTouchHandle?.({ kind: 'chapter', id: chapter.id }, chapter.title) ?? {})}
                    />
                    <EditorButton
                      variant="chapter"
                      type="button"
                      active={chapter.id === activeChapterId}
                      onClick={() => void onSelectChapter(chapter.id)}
                    >
                      <span className="chapter-num">第{index + 1}章</span>
                      <span className="chapter-title">{chapter.title}</span>
                      <span className="chapter-status">
                        {chapter.id === activeChapterId
                          ? '编辑中'
                          : chapter.wordCount > 0
                            ? `${chapter.wordCount}字`
                            : '待写'}
                      </span>
                    </EditorButton>
                  </div>
                </div>
              )
            })
          )}
          <EditorButton
            variant="dashed"
            size="sm"
            fullWidth
            type="button"
            onClick={() => void onAddChapter('新章节', volume.id)}
            disabled={!activeNovelId || busy}
            style={{ marginTop: '0.15rem' }}
          >
            <PlusIcon />
            <span>本卷新增章节</span>
          </EditorButton>
        </div>
      </div>
    </div>
  )
}
