import type { DragEvent } from 'react'
import type { ChapterSummary, Volume } from '../../../types/novel'
import { EditorButton } from '../../ui/EditorButton'
import { allowOutlineDrop } from './outlineDrag'
import { ChevronIcon, PlusIcon } from './outlineIcons'
import type { DragPayload, DropTarget } from './outlineTypes'
import {
  ChapterDropZone,
  ChapterListCollapsible,
  ChapterListInner,
  ChapterRow,
  ChevronWrap,
  DragHandle,
  OutlineItem,
  VolumeBlock,
  VolumeHeaderRow,
} from './outlineStyles'

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
}: OutlineVolumeBlockProps) {
  const volumeDropActive = dropTarget?.kind === 'volume' && dropTarget.volumeId === volume.id

  return (
    <VolumeBlock
      $dragOver={volumeDropActive}
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
      <VolumeHeaderRow>
        <DragHandle
          draggable
          title="拖拽排序卷"
          onDragStart={(event) => onVolumeDragStart(event, volume.id)}
          onDragEnd={onDragEnd}
        >
          ⋮⋮
        </DragHandle>
        <EditorButton variant="volume" type="button" onClick={onToggleExpand}>
          <span className="title">{volume.title}</span>
          <span className="meta">{volumeChapters.length} 章</span>
          <ChevronWrap $open={expanded}>
            <ChevronIcon />
          </ChevronWrap>
        </EditorButton>
      </VolumeHeaderRow>
      <ChapterListCollapsible $open={expanded}>
        <ChapterListInner>
          {volumeChapters.length === 0 ? (
            <ChapterDropZone
              $dragOver={dropTarget?.volumeId === volume.id && dropTarget.kind === 'chapter'}
              onDragOver={(event) => {
                if (dragging?.kind !== 'chapter') return
                allowOutlineDrop(event)
                onSetDropTarget({ kind: 'chapter', volumeId: volume.id, chapterId: null })
              }}
              onDrop={(event) => void onChapterDrop(event, volume.id, null)}
            >
              拖拽章节到此处
            </ChapterDropZone>
          ) : (
            volumeChapters.map((chapter, index) => {
              const chapterDropActive =
                dropTarget?.kind === 'chapter' &&
                dropTarget.volumeId === volume.id &&
                dropTarget.chapterId === chapter.id
              return (
                <OutlineItem
                  key={chapter.id}
                  $active={chapter.id === activeChapterId}
                  $inProgress={chapter.wordCount > 0 && chapter.id !== activeChapterId}
                  $dragOver={chapterDropActive}
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
                  <ChapterRow>
                    <DragHandle
                      draggable
                      title="拖拽移动章节"
                      onDragStart={(event) => onChapterDragStart(event, chapter.id)}
                      onDragEnd={onDragEnd}
                    >
                      ⋮⋮
                    </DragHandle>
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
                  </ChapterRow>
                </OutlineItem>
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
        </ChapterListInner>
      </ChapterListCollapsible>
    </VolumeBlock>
  )
}
