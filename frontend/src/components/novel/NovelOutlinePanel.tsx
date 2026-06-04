import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { useNovelStore } from '../../stores/novelStore'
import {
  buildChapterReorderPlans,
  reorderVolumeIds,
  sortChapters,
} from '../../utils/outlineDrag'
import { EditorButton } from '../ui/EditorButton'
import { OutlineVolumeBlock } from './outline/OutlineVolumeBlock'
import { readDragPayload, writeDragPayload } from './outline/outlineDrag'
import { PlusIcon } from './outline/outlineIcons'
import { DragHint, Hint, OutlineList } from './outline/outlineStyles'
import type { DragPayload, DropTarget } from './outline/outlineTypes'

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
  const activeNovelId = useNovelStore((s) => s.activeNovelId)
  const volumes = useNovelStore((s) => s.volumes)
  const chapters = useNovelStore((s) => s.chapters)
  const activeChapterId = useNovelStore((s) => s.activeChapterId)
  const selectChapter = useNovelStore((s) => s.selectChapter)
  const addChapter = useNovelStore((s) => s.addChapter)
  const addVolume = useNovelStore((s) => s.addVolume)
  const reorderVolumes = useNovelStore((s) => s.reorderVolumes)
  const applyChapterReorderPlans = useNovelStore((s) => s.applyChapterReorderPlans)

  const [expandedVolumeIds, setExpandedVolumeIds] = useState<Record<string, boolean>>({})
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const [busy, setBusy] = useState(false)

  const volumeGroups = useMemo(
    () =>
      volumes.map((volume) => ({
        volume,
        chapters: sortChapters(chapters.filter((chapter) => chapter.volumeId === volume.id)),
      })),
    [volumes, chapters],
  )

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
    const title = window.prompt('新卷名称', `第${volumes.length + 1}卷`)
    if (!title?.trim()) return
    try {
      await addVolume(title.trim())
    } catch {
      window.alert('创建卷失败')
    }
  }, [activeNovelId, volumes.length, addVolume])

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
        window.alert('卷排序失败')
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
        window.alert('章节移动失败')
      } finally {
        setBusy(false)
      }
    },
    [applyChapterReorderPlans, busy, chapters, handleDragEnd],
  )

  return (
    <>
      <DragHint>拖拽卷标题栏排序；拖拽章节可跨卷移动或调整顺序</DragHint>
      <OutlineList>
        {volumeGroups.length === 0 ? (
          <Hint>暂无卷与章节</Hint>
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
              dragging={dragging}
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
            />
          ))
        )}
      </OutlineList>
      <EditorButton
        variant="dashed"
        fullWidth
        type="button"
        onClick={() => void handleAddVolume()}
        disabled={!activeNovelId || busy}
        style={{ marginTop: '0.75rem' }}
      >
        <PlusIcon />
        <span>新增卷</span>
      </EditorButton>
      <EditorButton
        variant="accent"
        fullWidth
        type="button"
        onClick={onReindex}
        disabled={!activeNovelId || reindexing || busy}
        style={{ marginTop: '0.45rem' }}
      >
        {reindexing
          ? reindexProgress
            ? `重建中 ${reindexProgress.processed}/${reindexProgress.chapters}`
            : '重建索引中…'
          : '重建向量索引'}
      </EditorButton>
    </>
  )
}
