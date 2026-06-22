import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNovelStore } from '../../stores/novelStore'
import {
  buildChapterReorderPlans,
  reorderVolumeIds,
  sortChapters,
} from '../../utils/outlineDrag'
import { alertDialog, confirmAction, promptDialog } from '../../stores/appDialog'
import { useOutlineTouchDrag } from '../../hooks/useOutlineTouchDrag'
import { EditorButton } from '../ui/EditorButton'
import { EditorIcons } from '../editor/icons'
import { OutlineVolumeBlock } from './outline/OutlineVolumeBlock'
import { readDragPayload, writeDragPayload } from './outline/outlineDrag'
import { PlusIcon } from './outline/outlineIcons'
import { OUTLINE_DRAG_HINT, OUTLINE_HINT, OUTLINE_LIST, OUTLINE_SECTION_LABEL } from '@/lib/outlineClasses'
import type { DragPayload, DropTarget } from './outline/outlineTypes'
import { OUTLINE_FLAT_VOLUME_ID } from './outline/outlineTypes'
import type { Volume } from '../../types/novel'

export interface NovelOutlinePanelProps {
  reindexing: boolean
  reindexProgress: { processed: number; chapters: number } | null
  onReindex: () => void
}

export function NovelOutlinePanel({
  reindexing,
  reindexProgress,
  onReindex,
}: NovelOutlinePanelProps) {
  const { t } = useTranslation(['editor'])
  const activeNovelId = useNovelStore((s) => s.activeNovelId)
  const volumes = useNovelStore((s) => s.volumes)
  const chapters = useNovelStore((s) => s.chapters)
  const activeChapterId = useNovelStore((s) => s.activeChapterId)
  const selectChapter = useNovelStore((s) => s.selectChapter)
  const addChapter = useNovelStore((s) => s.addChapter)
  const deleteChapter = useNovelStore((s) => s.deleteChapter)
  const renameChapter = useNovelStore((s) => s.renameChapter)
  const addVolume = useNovelStore((s) => s.addVolume)
  const reorderVolumes = useNovelStore((s) => s.reorderVolumes)
  const applyChapterReorderPlans = useNovelStore((s) => s.applyChapterReorderPlans)
  const loadChapters = useNovelStore((s) => s.loadChapters)
  const loadVolumes = useNovelStore((s) => s.loadVolumes)

  const [expandedVolumeIds, setExpandedVolumeIds] = useState<Record<string, boolean>>({})
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const [busy, setBusy] = useState(false)

  const volumeGroups = useMemo(() => {
    const sortedChapters = sortChapters(chapters)

    if (volumes.length === 0) {
      if (sortedChapters.length === 0) return []
      const flatVolume: Volume = {
        id: OUTLINE_FLAT_VOLUME_ID,
        title: '',
        sortOrder: 0,
        novelId: activeNovelId ?? '',
        chapterCount: sortedChapters.length,
        createdAt: 0,
        updatedAt: 0,
      }
      return [{ volume: flatVolume, chapters: sortedChapters }]
    }

    const groups = volumes.map((volume) => ({
      volume,
      chapters: sortChapters(sortedChapters.filter((chapter) => chapter.volumeId === volume.id)),
    }))

    const assignedIds = new Set(groups.flatMap((group) => group.chapters.map((chapter) => chapter.id)))
    const orphanChapters = sortedChapters.filter((chapter) => !assignedIds.has(chapter.id))
    if (orphanChapters.length > 0) {
      groups.push({
        volume: {
          id: OUTLINE_FLAT_VOLUME_ID,
          title: '',
          sortOrder: groups.length,
          novelId: activeNovelId ?? '',
          chapterCount: orphanChapters.length,
          createdAt: 0,
          updatedAt: 0,
        },
        chapters: orphanChapters,
      })
    }

    return groups
  }, [activeNovelId, volumes, chapters])

  useEffect(() => {
    if (!activeNovelId) return
    const missingActive =
      activeChapterId != null && !chapters.some((chapter) => chapter.id === activeChapterId)
    if (chapters.length === 0 || missingActive) {
      void loadVolumes(activeNovelId)
      void loadChapters(activeNovelId, { listOnly: true })
    }
  }, [activeChapterId, activeNovelId, chapters, loadChapters, loadVolumes])

  useEffect(() => {
    if (volumes.length === 0) return
    setExpandedVolumeIds((prev) => {
      const next = { ...prev }
      for (const volume of volumes) {
        if (next[volume.id] === undefined) {
          next[volume.id] = true
        }
      }
      return next
    })
  }, [volumes])

  const handleAddVolume = useCallback(async () => {
    if (!activeNovelId) return
    const title = await promptDialog({
      title: t('editor:outline.newVolumeTitle'),
      defaultValue: t('editor:outline.newVolumeDefault', { n: volumes.length + 1 }),
      placeholder: t('editor:outline.newVolumePlaceholder'),
      confirmLabel: t('editor:outline.createVolume'),
    })
    if (!title) return
    try {
      await addVolume(title)
    } catch {
      void alertDialog({ title: t('editor:outline.createVolumeFail') })
    }
  }, [activeNovelId, addVolume, t, volumes.length])

  const handleDeleteChapter = useCallback(
    async (chapterId: string, title: string) => {
      if (
        !(await confirmAction({
          title: t('editor:outline.deleteChapterTitle'),
          description: t('editor:outline.deleteChapterDesc', { title }),
          confirmLabel: t('common:delete'),
          danger: true,
        }))
      ) {
        return
      }
      setBusy(true)
      try {
        await deleteChapter(chapterId)
      } catch {
        void alertDialog({ title: t('editor:outline.deleteChapterFail') })
      } finally {
        setBusy(false)
      }
    },
    [deleteChapter, t],
  )

  const handleRenameChapter = useCallback(
    async (chapterId: string, currentTitle: string) => {
      const title = await promptDialog({
        title: t('editor:outline.renameChapterTitle'),
        defaultValue: currentTitle,
        placeholder: t('editor:outline.renameChapterPlaceholder'),
        confirmLabel: t('common:save'),
      })
      if (!title || title.trim() === currentTitle.trim()) return
      setBusy(true)
      try {
        await renameChapter(chapterId, title.trim())
      } catch {
        void alertDialog({ title: t('editor:outline.renameChapterFail') })
      } finally {
        setBusy(false)
      }
    },
    [renameChapter, t],
  )

  const handleDragEnd = useCallback(() => {
    setDragging(null)
    setDropTarget(null)
  }, [])

  const handleVolumeDragStart = useCallback((event: DragEvent, volumeId: string) => {
    writeDragPayload(event, { kind: 'volume', id: volumeId })
    setDragging({ kind: 'volume', id: volumeId })
  }, [])

  const handleChapterDragStart = useCallback((event: DragEvent, chapterId: string) => {
    event.stopPropagation()
    writeDragPayload(event, { kind: 'chapter', id: chapterId })
    setDragging({ kind: 'chapter', id: chapterId })
  }, [])

  const handleVolumeDrop = useCallback(
    async (event: DragEvent, targetVolumeId: string) => {
      event.preventDefault()
      event.stopPropagation()
      const payload = readDragPayload(event)
      handleDragEnd()
      if (!payload || payload.kind !== 'volume' || payload.id === targetVolumeId || busy) {
        return
      }
      setBusy(true)
      try {
        await reorderVolumes(reorderVolumeIds(volumes, payload.id, targetVolumeId))
      } catch {
        void alertDialog({ title: t('editor:outline.reorderVolumeFail') })
      } finally {
        setBusy(false)
      }
    },
    [busy, handleDragEnd, reorderVolumes, volumes],
  )

  const handleChapterDrop = useCallback(
    async (event: DragEvent, targetVolumeId: string, beforeChapterId: string | null) => {
      event.preventDefault()
      event.stopPropagation()
      const payload = readDragPayload(event)
      handleDragEnd()
      if (!payload || payload.kind !== 'chapter' || busy) {
        return
      }
      const plans = buildChapterReorderPlans(
        chapters,
        payload.id,
        targetVolumeId,
        beforeChapterId,
      )
      if (plans.length === 0) {
        return
      }
      setBusy(true)
      try {
        await applyChapterReorderPlans(plans)
      } catch {
        void alertDialog({ title: t('editor:outline.moveChapterFail') })
      } finally {
        setBusy(false)
      }
    },
    [applyChapterReorderPlans, busy, chapters, handleDragEnd],
  )

  const handleTouchDropChapter = useCallback(
    async (draggedChapterId: string, targetVolumeId: string, beforeChapterId: string | null) => {
      const plans = buildChapterReorderPlans(
        chapters,
        draggedChapterId,
        targetVolumeId,
        beforeChapterId,
      )
      if (plans.length === 0) return
      setBusy(true)
      try {
        await applyChapterReorderPlans(plans)
      } catch {
        void alertDialog({ title: t('editor:outline.moveChapterFail') })
      } finally {
        setBusy(false)
      }
    },
    [applyChapterReorderPlans, chapters],
  )

  const handleTouchDropVolume = useCallback(
    async (draggedVolumeId: string, targetVolumeId: string) => {
      setBusy(true)
      try {
        await reorderVolumes(reorderVolumeIds(volumes, draggedVolumeId, targetVolumeId))
      } catch {
        void alertDialog({ title: t('editor:outline.reorderVolumeFail') })
      } finally {
        setBusy(false)
      }
    },
    [reorderVolumes, volumes],
  )

  const { touchDragging, bindTouchHandle, touchDragGhost } = useOutlineTouchDrag({
    enabled: true,
    busy,
    setDropTarget,
    onDropChapter: handleTouchDropChapter,
    onDropVolume: handleTouchDropVolume,
  })

  const activeDragging = dragging ?? touchDragging

  return (
    <>
      {touchDragGhost}
      <div className={OUTLINE_SECTION_LABEL}>{t('editor:outline.catalog')}</div>
      <div className={OUTLINE_DRAG_HINT}>{t('editor:outline.dragHint')}</div>
      <div className={OUTLINE_LIST}>
        {volumeGroups.length === 0 ? (
          <div className={OUTLINE_HINT}>{t('editor:outline.empty')}</div>
        ) : (
          volumeGroups.map(({ volume, chapters: volumeChapters }) => (
            <OutlineVolumeBlock
              key={volume.id}
              volume={volume}
              volumeChapters={volumeChapters}
              expanded={expandedVolumeIds[volume.id] !== false}
              activeChapterId={activeChapterId}
              activeNovelId={activeNovelId}
              busy={busy}
              dragging={activeDragging}
              dropTarget={dropTarget}
              onToggleExpand={() =>
                setExpandedVolumeIds((prev) => ({
                  ...prev,
                  [volume.id]: !(prev[volume.id] !== false),
                }))
              }
              onVolumeDragStart={handleVolumeDragStart}
              onChapterDragStart={handleChapterDragStart}
              onDragEnd={handleDragEnd}
              onVolumeDrop={handleVolumeDrop}
              onChapterDrop={handleChapterDrop}
              onSetDropTarget={setDropTarget}
              onSelectChapter={selectChapter}
              onAddChapter={addChapter}
              onDeleteChapter={handleDeleteChapter}
              onRenameChapter={handleRenameChapter}
              bindTouchHandle={bindTouchHandle}
            />
          ))
        )}
      </div>
      <EditorButton
        variant="dashed"
        fullWidth
        type="button"
        onClick={() => void handleAddVolume()}
        disabled={!activeNovelId || busy}
        style={{ marginTop: '0.75rem' }}
      >
        <PlusIcon />
        <span>{t('editor:outline.newVolume')}</span>
      </EditorButton>
      <EditorButton
        variant="secondary"
        size="sm"
        fullWidth
        type="button"
        onClick={onReindex}
        disabled={!activeNovelId || reindexing || busy}
        className="mt-2 h-8 gap-1.5"
      >
        {!reindexing ? <EditorIcons.Refresh /> : null}
        <span>
          {reindexing
            ? reindexProgress
              ? t('editor:outline.reindexProgress', {
                  processed: reindexProgress.processed,
                  chapters: reindexProgress.chapters,
                })
              : t('editor:outline.reindexing')
            : t('editor:outline.reindex')}
        </span>
      </EditorButton>
    </>
  )
}
