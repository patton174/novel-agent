import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import type { ChapterSummary, Volume } from '../../../types/novel'
import { EditorButton } from '../../ui/EditorButton'
import { allowOutlineDrop } from './outlineDrag'
import { OutlineDragHandle } from './OutlineDragHandle'
import { outlineChapterDropProps, outlineVolumeDropProps } from './outlineTouchDom'
import { ChevronIcon, PlusIcon } from './outlineIcons'
import type { DragPayload, DropTarget } from './outlineTypes'
import { OUTLINE_FLAT_VOLUME_ID } from './outlineTypes'
import { cn } from '@/lib/utils'
import {
  OUTLINE_CHAPTER_ACTION_BTN,
  OUTLINE_CHAPTER_ACTION_BTN_DANGER,
  OUTLINE_CHAPTER_LIST_INNER,
  OUTLINE_CHAPTER_ROW,
  OUTLINE_VOLUME_HEADER,
  outlineChapterActionsClass,
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
  onDeleteChapter: (chapterId: string, title: string) => void
  onRenameChapter: (chapterId: string, title: string) => void
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
  onDeleteChapter,
  onRenameChapter,
  bindTouchHandle,
}: OutlineVolumeBlockProps) {
  const { t } = useTranslation(['editor'])
  const isFlatVolume = volume.id === OUTLINE_FLAT_VOLUME_ID
  const volumeDropActive = !isFlatVolume && dropTarget?.kind === 'volume' && dropTarget.volumeId === volume.id

  const chapterListInner = (
    <div className={isFlatVolume ? 'flex flex-col gap-[0.35rem]' : OUTLINE_CHAPTER_LIST_INNER}>
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
          {t('editor:outline.dropChapterHere')}
        </div>
      ) : (
        volumeChapters.map((chapter, index) => {
          const chapterDropActive =
            dropTarget?.kind === 'chapter' &&
            dropTarget.volumeId === volume.id &&
            dropTarget.chapterId === chapter.id
          const isActive = chapter.id === activeChapterId
          return (
            <div
              key={chapter.id}
              className={cn(
                'group/chapter',
                outlineItemClass({
                  active: isActive,
                  inProgress: chapter.wordCount > 0 && !isActive,
                  dragOver: chapterDropActive,
                }),
              )}
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
                  title={t('editor:picker.dragChapter')}
                  disabled={busy}
                  onDragStart={(event) => onChapterDragStart(event, chapter.id)}
                  onDragEnd={onDragEnd}
                  {...(bindTouchHandle?.({ kind: 'chapter', id: chapter.id }, chapter.title) ?? {})}
                />
                <EditorButton
                  variant="chapter"
                  type="button"
                  active={isActive}
                  onClick={() => void onSelectChapter(chapter.id)}
                  className="min-w-0 flex-1"
                >
                  <span className="chapter-num">
                    {t('editor:outline.chapterIndex', { n: index + 1 })}
                  </span>
                  <span className="chapter-title">{chapter.title}</span>
                  <span className="chapter-status">
                    {isActive
                      ? t('editor:picker.editing')
                      : chapter.wordCount > 0
                        ? t('editor:picker.wordCount', { count: chapter.wordCount })
                        : t('editor:picker.toWrite')}
                  </span>
                </EditorButton>
                <div className={outlineChapterActionsClass(isActive)}>
                  <EditorButton
                    variant="icon"
                    type="button"
                    size="sm"
                    title={t('editor:sessionList.rename')}
                    disabled={busy}
                    className={OUTLINE_CHAPTER_ACTION_BTN}
                    onClick={(event) => {
                      event.stopPropagation()
                      void onRenameChapter(chapter.id, chapter.title)
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </EditorButton>
                  <EditorButton
                    variant="icon"
                    type="button"
                    size="sm"
                    title={t('editor:outline.deleteChapterTitle')}
                    disabled={busy}
                    className={OUTLINE_CHAPTER_ACTION_BTN_DANGER}
                    onClick={(event) => {
                      event.stopPropagation()
                      void onDeleteChapter(chapter.id, chapter.title)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </EditorButton>
                </div>
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
        onClick={() => void onAddChapter(t('editor:picker.newChapterTitle'), volume.id)}
        disabled={!activeNovelId || busy}
        style={{ marginTop: '0.15rem' }}
      >
        <PlusIcon />
        <span>{t('editor:outline.addChapterInVolume')}</span>
      </EditorButton>
    </div>
  )

  return (
    <div
      className={outlineVolumeBlockClass(volumeDropActive)}
      {...(isFlatVolume ? {} : outlineVolumeDropProps(volume.id))}
      onDragOver={
        isFlatVolume
          ? undefined
          : (event) => {
              if (dragging?.kind !== 'volume') return
              allowOutlineDrop(event)
              onSetDropTarget({ kind: 'volume', volumeId: volume.id })
            }
      }
      onDragLeave={
        isFlatVolume
          ? undefined
          : () => {
              onSetDropTarget((current) =>
                current?.volumeId === volume.id && current.kind === 'volume' ? null : current,
              )
            }
      }
      onDrop={isFlatVolume ? undefined : (event) => void onVolumeDrop(event, volume.id)}
    >
      {!isFlatVolume ? (
        <div className={OUTLINE_VOLUME_HEADER}>
          <OutlineDragHandle
            title={t('editor:picker.dragVolume')}
            disabled={busy}
            onDragStart={(event) => onVolumeDragStart(event, volume.id)}
            onDragEnd={onDragEnd}
            {...(bindTouchHandle?.({ kind: 'volume', id: volume.id }, volume.title) ?? {})}
          />
          <EditorButton variant="volume" type="button" onClick={onToggleExpand}>
            <span className="title">{volume.title}</span>
            <span className="meta">{t('editor:picker.volumeCount', { count: volumeChapters.length })}</span>
            <span className={outlineChevronWrapClass(expanded)}>
              <ChevronIcon />
            </span>
          </EditorButton>
        </div>
      ) : null}
      {isFlatVolume ? (
        chapterListInner
      ) : (
        <div className={outlineChapterListCollapsibleClass(expanded)}>{chapterListInner}</div>
      )}
    </div>
  )
}
