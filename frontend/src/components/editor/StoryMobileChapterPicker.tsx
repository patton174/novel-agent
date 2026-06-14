import { useCallback, useMemo, useState } from 'react'
import { ArrowDown, ArrowRightLeft, ArrowUp, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useNovelStore } from '@/stores/novelStore'
import {
  buildChapterMoveToVolumePlans,
  buildChapterReorderPlans,
  buildChapterStepMovePlans,
  buildVolumeStepMoveIds,
  reorderVolumeIds,
  sortChapters,
} from '@/utils/outlineDrag'
import { promptDialog, alertDialog } from '@/stores/appDialog'
import { useOutlineTouchDrag } from '@/hooks/useOutlineTouchDrag'
import { EditorButton } from '@/components/ui/EditorButton'
import { OutlineDragHandle } from '@/components/novel/outline/OutlineDragHandle'
import {
  outlineChapterDropProps,
  outlineVolumeDropProps,
} from '@/components/novel/outline/outlineTouchDom'
import type { DropTarget } from '@/components/novel/outline/outlineTypes'
import { MoveChapterToVolumeDialog } from '@/components/editor/MoveChapterToVolumeDialog'
import { cn } from '@/lib/utils'

import { useTranslation } from 'react-i18next'

/** 移动分屏顶栏：一步点选章节，无需全屏 overlay */
export function StoryMobileChapterPicker() {
  const { t } = useTranslation(['editor'])
  const activeNovelId = useNovelStore((s) => s.activeNovelId)
  const volumes = useNovelStore((s) => s.volumes)
  const chapters = useNovelStore((s) => s.chapters)
  const activeChapterId = useNovelStore((s) => s.activeChapterId)
  const selectChapter = useNovelStore((s) => s.selectChapter)
  const addChapter = useNovelStore((s) => s.addChapter)
  const addVolume = useNovelStore((s) => s.addVolume)
  const applyChapterReorderPlans = useNovelStore((s) => s.applyChapterReorderPlans)
  const reorderVolumes = useNovelStore((s) => s.reorderVolumes)

  const [reorderMode, setReorderMode] = useState(false)
  const [pickerCollapsed, setPickerCollapsed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [moveChapterId, setMoveChapterId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const volumeGroups = useMemo(
    () =>
      volumes.map((volume) => ({
        volume,
        chapters: sortChapters(chapters.filter((c) => c.volumeId === volume.id)),
      })),
    [volumes, chapters],
  )

  const canReorder =
    volumes.length > 1 || volumeGroups.some((group) => group.chapters.length > 1)

  type ChapterPickerVirtualRow =
    | { type: 'volume'; key: string; volumeId: string; title: string; chapterCount: number }
    | {
        type: 'chapter'
        key: string
        volumeId: string
        chapterId: string
        chapterTitle: string
        volumeChapterIndex: number
        wordCount: number
      }
    | { type: 'add'; key: string; volumeId: string }

  const browseRows = useMemo<ChapterPickerVirtualRow[]>(
    () =>
      volumeGroups.flatMap(({ volume, chapters: volumeChapters }) => {
        const chapterRows: ChapterPickerVirtualRow[] = volumeChapters.map((chapter, index) => ({
          type: 'chapter',
          key: `chapter:${chapter.id}`,
          volumeId: volume.id,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          volumeChapterIndex: index,
          wordCount: chapter.wordCount,
        }))
        return [
          {
            type: 'volume',
            key: `volume:${volume.id}`,
            volumeId: volume.id,
            title: volume.title,
            chapterCount: volumeChapters.length,
          } satisfies ChapterPickerVirtualRow,
          ...chapterRows,
          { type: 'add', key: `add:${volume.id}`, volumeId: volume.id } satisfies ChapterPickerVirtualRow,
        ]
      }),
    [volumeGroups],
  )

  const [listScrollEl, setListScrollEl] = useState<HTMLDivElement | null>(null)

  const browseVirtualizer = useVirtualizer({
    count: reorderMode ? 0 : browseRows.length,
    getScrollElement: () => listScrollEl,
    estimateSize: (index) => {
      const row = browseRows[index]
      if (!row) return 56
      if (row.type === 'volume') return 34
      if (row.type === 'add') return 42
      return 52
    },
    overscan: 10,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 0,
  })

  const moveChapter = moveChapterId
    ? chapters.find((chapter) => chapter.id === moveChapterId) ?? null
    : null

  const handleCreateFirst = async () => {
    if (!activeNovelId) return
    if (volumes.length === 0) {
      await addVolume(t('editor:picker.firstVolume'))
    }
    const title = await promptDialog({
      title: t('editor:picker.newChapterTitle'),
      defaultValue: t('editor:picker.firstChapter'),
      placeholder: t('editor:picker.chapterTitlePlaceholder'),
      confirmLabel: t('editor:picker.create'),
    })
    if (title) {
      await addChapter(title.trim() || t('editor:picker.newChapterTitle'))
    }
  }

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    if (busy) return
    const plans = buildChapterStepMovePlans(chapters, chapterId, direction)
    if (plans.length === 0) return
    setBusy(true)
    try {
      await applyChapterReorderPlans(plans)
    } catch {
      void alertDialog({ title: t('editor:picker.reorderChapterFail') })
    } finally {
      setBusy(false)
    }
  }

  const handleMoveVolume = async (volumeId: string, direction: 'up' | 'down') => {
    if (busy) return
    const nextIds = buildVolumeStepMoveIds(volumes, volumeId, direction)
    if (nextIds.every((id, index) => id === volumes[index]?.id)) {
      return
    }
    setBusy(true)
    try {
      await reorderVolumes(nextIds)
    } catch {
      void alertDialog({ title: t('editor:picker.reorderVolumeFail') })
    } finally {
      setBusy(false)
    }
  }

  const handleMoveToVolume = async (targetVolumeId: string, position: 'start' | 'end') => {
    if (!moveChapterId || busy) return
    const plans = buildChapterMoveToVolumePlans(
      chapters,
      moveChapterId,
      targetVolumeId,
      position,
    )
    if (plans.length === 0) {
      setMoveChapterId(null)
      return
    }
    setBusy(true)
    try {
      await applyChapterReorderPlans(plans)
      setMoveChapterId(null)
    } catch {
      void alertDialog({ title: t('editor:picker.moveCrossVolumeFail') })
    } finally {
      setBusy(false)
    }
  }

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
        void alertDialog({ title: t('editor:picker.moveChapterFail') })
      } finally {
        setBusy(false)
      }
    },
    [applyChapterReorderPlans, chapters, t],
  )

  const handleTouchDropVolume = useCallback(
    async (draggedVolumeId: string, targetVolumeId: string) => {
      setBusy(true)
      try {
        await reorderVolumes(reorderVolumeIds(volumes, draggedVolumeId, targetVolumeId))
      } catch {
        void alertDialog({ title: t('editor:picker.reorderVolumeFail') })
      } finally {
        setBusy(false)
      }
    },
    [reorderVolumes, volumes, t],
  )

  const { bindTouchHandle, touchDragGhost } = useOutlineTouchDrag({
    enabled: reorderMode,
    busy,
    setDropTarget,
    onDropChapter: handleTouchDropChapter,
    onDropVolume: handleTouchDropVolume,
  })

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null

  return (
    <>
      {touchDragGhost}
      {pickerCollapsed ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">
              {activeChapter?.title ?? t('editor:picker.unselectedChapter')}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('editor:picker.fullscreenHint')}</p>
          </div>
          <EditorButton
            variant="secondary"
            size="sm"
            type="button"
            className="h-8 shrink-0 gap-1 px-2.5 text-xs"
            onClick={() => setPickerCollapsed(false)}
          >
            <ChevronDown className="size-3.5" />
            {t('editor:picker.selectChapter')}
          </EditorButton>
        </div>
      ) : (
      <div className="flex min-h-[7rem] max-h-[min(28dvh,36svh)] shrink-0 flex-col border-b border-border/70 bg-muted/20">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">
              {reorderMode ? t('editor:picker.reorderMode') : t('editor:picker.writeMode')}
            </p>
            {reorderMode ? (
              <p className="text-[10px] text-muted-foreground/90">
                {t('editor:picker.reorderHint')}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!reorderMode ? (
              <EditorButton
                variant="ghost"
                size="sm"
                type="button"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => setPickerCollapsed(true)}
              >
                <ChevronUp className="size-3.5" />
                {t('editor:picker.fullscreen')}
              </EditorButton>
            ) : null}
            {canReorder ? (
              <EditorButton
                variant={reorderMode ? 'primary' : 'secondary'}
                size="sm"
                type="button"
                className="h-8 px-2.5 text-xs"
                disabled={busy}
                onClick={() => {
                  setReorderMode((open) => !open)
                  setMoveChapterId(null)
                }}
              >
                {reorderMode ? t('editor:picker.done') : t('editor:picker.reorder')}
              </EditorButton>
            ) : null}
            {!reorderMode ? (
              <EditorButton
                variant="secondary"
                size="sm"
                type="button"
                className="h-8 gap-1 px-2.5 text-xs"
                onClick={() => void handleCreateFirst()}
              >
                <Plus className="size-3.5" />
                {t('editor:picker.newChapter')}
              </EditorButton>
            ) : null}
          </div>
        </div>

        <div
          ref={setListScrollEl}
          className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-width:thin]"
        >
          {volumeGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">{t('editor:picker.noChapters')}</p>
              <EditorButton variant="primary" size="sm" type="button" onClick={() => void handleCreateFirst()}>
                <Plus className="size-3.5" />
                {t('editor:picker.createFirstChapter')}
              </EditorButton>
            </div>
          ) : (
            reorderMode ? (
              <div className="space-y-3">
                {volumeGroups.map(({ volume, chapters: volumeChapters }, volumeIndex) => {
                  const canMoveVolumeUp = volumeIndex > 0
                  const canMoveVolumeDown = volumeIndex < volumeGroups.length - 1

                  return (
                    <div key={volume.id} {...outlineVolumeDropProps(volume.id)}>
                      <div
                        className={cn(
                          'sticky top-0 z-[1] flex items-center gap-1 bg-muted/90 px-1 py-1 pr-0.5 backdrop-blur-sm',
                          dropTarget?.kind === 'volume' &&
                            dropTarget.volumeId === volume.id &&
                            'ring-2 ring-inset ring-primary/50',
                        )}
                      >
                        {volumes.length > 1 ? (
                          <OutlineDragHandle
                            title={t('editor:picker.dragVolume')}
                            disabled={busy}
                            className="scale-90"
                            {...bindTouchHandle({ kind: 'volume', id: volume.id }, volume.title)}
                          />
                        ) : null}
                        <p className="min-w-0 flex-1 text-ui-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {volume.title}
                          <span className="ml-1.5 font-normal normal-case tabular-nums">
                            {volumeChapters.length} {t('editor:picker.volumeCount')}
                          </span>
                        </p>
                        {volumes.length > 1 ? (
                          <div className="flex shrink-0 items-center">
                            <EditorButton
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="size-7 p-0"
                              disabled={!canMoveVolumeUp || busy}
                              aria-label={t('editor:picker.moveVolumeUp')}
                              onClick={() => void handleMoveVolume(volume.id, 'up')}
                            >
                              <ArrowUp className="size-3.5" />
                            </EditorButton>
                            <EditorButton
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="size-7 p-0"
                              disabled={!canMoveVolumeDown || busy}
                              aria-label={t('editor:picker.moveVolumeDown')}
                              onClick={() => void handleMoveVolume(volume.id, 'down')}
                            >
                              <ArrowDown className="size-3.5" />
                            </EditorButton>
                          </div>
                        ) : null}
                      </div>
                      <ul className="mt-1 space-y-1">
                        {volumeChapters.map((chapter, index) => {
                          const active = chapter.id === activeChapterId
                          const canMoveUp = index > 0
                          const canMoveDown = index < volumeChapters.length - 1
                          const chapterDropActive =
                            dropTarget?.kind === 'chapter' &&
                            dropTarget.volumeId === volume.id &&
                            dropTarget.chapterId === chapter.id

                          return (
                            <li
                              key={chapter.id}
                              className={cn(
                                'flex items-center gap-0.5 rounded-xl border px-1 py-1',
                                active
                                  ? 'border-primary/45 bg-primary/10'
                                  : 'border-border/60 bg-background/90',
                                chapterDropActive && 'ring-2 ring-inset ring-primary/45',
                              )}
                              {...outlineChapterDropProps(volume.id, chapter.id)}
                            >
                              <OutlineDragHandle
                                title={t('editor:picker.dragChapter')}
                                disabled={busy}
                                className="scale-90 shrink-0"
                                {...bindTouchHandle({ kind: 'chapter', id: chapter.id }, chapter.title)}
                              />
                              <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
                                {chapter.title}
                              </span>
                              <div className="flex shrink-0 items-center">
                                {volumes.length > 1 ? (
                                  <EditorButton
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    className="size-8 p-0"
                                    disabled={busy}
                                    aria-label={t('editor:picker.moveToOtherVolume')}
                                    onClick={() => setMoveChapterId(chapter.id)}
                                  >
                                    <ArrowRightLeft className="size-3.5" />
                                  </EditorButton>
                                ) : null}
                                <EditorButton
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  className="size-8 p-0"
                                  disabled={!canMoveUp || busy}
                                  aria-label={t('editor:picker.moveChapterUp')}
                                  onClick={() => void handleMoveChapter(chapter.id, 'up')}
                                >
                                  <ArrowUp className="size-4" />
                                </EditorButton>
                                <EditorButton
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  className="size-8 p-0"
                                  disabled={!canMoveDown || busy}
                                  aria-label={t('editor:picker.moveChapterDown')}
                                  onClick={() => void handleMoveChapter(chapter.id, 'down')}
                                >
                                  <ArrowDown className="size-4" />
                                </EditorButton>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="relative w-full" style={{ height: `${browseVirtualizer.getTotalSize()}px` }}>
                {browseVirtualizer.getVirtualItems().map((item) => {
                  const row = browseRows[item.index]
                  if (!row) return null

                  return (
                    <div
                      key={row.key}
                      ref={browseVirtualizer.measureElement}
                      data-index={item.index}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        transform: `translateY(${item.start}px)`,
                      }}
                    >
                      {row.type === 'volume' ? (
                        <div className="flex items-center gap-1 bg-muted/90 px-1 py-1 backdrop-blur-sm">
                          <p className="min-w-0 flex-1 text-ui-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            {row.title}
                            <span className="ml-1.5 font-normal normal-case tabular-nums">
                              {row.chapterCount} {t('editor:picker.volumeCount')}
                            </span>
                          </p>
                        </div>
                      ) : null}

                      {row.type === 'chapter' ? (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => void selectChapter(row.chapterId)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                              row.chapterId === activeChapterId
                                ? 'border-primary/45 bg-primary/10 shadow-sm'
                                : 'border-border/60 bg-background/90 active:bg-muted/60',
                            )}
                          >
                            <span
                              className={cn(
                                'shrink-0 text-ui-sm font-semibold tabular-nums',
                                row.chapterId === activeChapterId ? 'text-primary' : 'text-muted-foreground',
                              )}
                            >
                              {String(row.volumeChapterIndex + 1).padStart(2, '0')}
                            </span>
                            <span
                              className={cn(
                                'min-w-0 flex-1 truncate text-sm font-medium',
                                row.chapterId === activeChapterId ? 'text-primary' : 'text-foreground',
                              )}
                            >
                              {row.chapterTitle}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {row.chapterId === activeChapterId
                                ? t('editor:picker.editing')
                                : row.wordCount > 0
                                  ? t('editor:picker.wordCount', { count: row.wordCount })
                                  : t('editor:picker.toWrite')}
                            </span>
                          </button>
                        </div>
                      ) : null}

                      {row.type === 'add' ? (
                        <EditorButton
                          variant="dashed"
                          size="sm"
                          fullWidth
                          type="button"
                          className="mt-1.5 h-8 text-xs"
                          onClick={() => void addChapter(t('editor:picker.newChapterTitle'), row.volumeId)}
                        >
                          <Plus className="size-3.5" />
                          {t('editor:picker.addInVolume')}
                        </EditorButton>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>
      )}

      <MoveChapterToVolumeDialog
        open={Boolean(moveChapter)}
        chapterTitle={moveChapter?.title ?? ''}
        currentVolumeId={moveChapter?.volumeId ?? ''}
        volumes={volumes}
        busy={busy}
        onClose={() => setMoveChapterId(null)}
        onSelectVolume={(targetVolumeId, position) => void handleMoveToVolume(targetVolumeId, position)}
      />
    </>
  )
}
