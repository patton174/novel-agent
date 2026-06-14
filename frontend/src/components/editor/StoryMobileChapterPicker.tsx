import { useCallback, useMemo, useState } from 'react'
import { ArrowDown, ArrowRightLeft, ArrowUp, Plus } from 'lucide-react'
import { useNovelStore } from '@/stores/novelStore'
import {
  buildChapterMoveToVolumePlans,
  buildChapterReorderPlans,
  buildChapterStepMovePlans,
  buildVolumeStepMoveIds,
  reorderVolumeIds,
  sortChapters,
} from '@/utils/outlineDrag'
import { promptDialog, alertDialog } from '@/stores/confirmDialogStore'
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

/** 移动分屏顶栏：一步点选章节，无需全屏 overlay */
export function StoryMobileChapterPicker() {
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

  const moveChapter = moveChapterId
    ? chapters.find((chapter) => chapter.id === moveChapterId) ?? null
    : null

  const handleCreateFirst = async () => {
    if (!activeNovelId) return
    if (volumes.length === 0) {
      await addVolume('第一卷')
    }
    const title = await promptDialog({
      title: '新章节',
      defaultValue: '第一章',
      placeholder: '章节标题',
      confirmLabel: '创建',
    })
    if (title) {
      await addChapter(title.trim() || '新章节')
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
      void alertDialog({ title: '章节排序失败' })
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
      void alertDialog({ title: '卷排序失败' })
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
      void alertDialog({ title: '跨卷移动失败' })
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
        void alertDialog({ title: '章节移动失败' })
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
        void alertDialog({ title: '卷排序失败' })
      } finally {
        setBusy(false)
      }
    },
    [reorderVolumes, volumes],
  )

  const { bindTouchHandle, touchDragGhost } = useOutlineTouchDrag({
    enabled: reorderMode,
    busy,
    setDropTarget,
    onDropChapter: handleTouchDropChapter,
    onDropVolume: handleTouchDropVolume,
  })

  return (
    <>
      {touchDragGhost}
      <div className="flex min-h-[8rem] max-h-[32vh] shrink-0 flex-col border-b border-border/70 bg-muted/20">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">
              {reorderMode ? '章节 · 排序' : '章节 · 点选即写'}
            </p>
            {reorderMode ? (
              <p className="text-[10px] text-muted-foreground/90">
                按住 ⋮⋮ 拖拽 · ↑↓ 调序 · ⇄ 跨卷
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
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
                {reorderMode ? '完成' : '排序'}
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
                新章
              </EditorButton>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-width:thin]">
          {volumeGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">还没有章节</p>
              <EditorButton variant="primary" size="sm" type="button" onClick={() => void handleCreateFirst()}>
                <Plus className="size-3.5" />
                创建第一章
              </EditorButton>
            </div>
          ) : (
            <div className="space-y-3">
              {volumeGroups.map(({ volume, chapters: volumeChapters }, volumeIndex) => {
                const canMoveVolumeUp = volumeIndex > 0
                const canMoveVolumeDown = volumeIndex < volumeGroups.length - 1

                return (
                  <div key={volume.id} {...(reorderMode ? outlineVolumeDropProps(volume.id) : {})}>
                    <div
                      className={cn(
                        'sticky top-0 z-[1] flex items-center gap-1 bg-muted/90 px-1 py-1 backdrop-blur-sm',
                        reorderMode && volumes.length > 1 && 'pr-0.5',
                        reorderMode &&
                          dropTarget?.kind === 'volume' &&
                          dropTarget.volumeId === volume.id &&
                          'ring-2 ring-inset ring-primary/50',
                      )}
                    >
                      {reorderMode && volumes.length > 1 ? (
                        <OutlineDragHandle
                          title="拖拽排序卷"
                          disabled={busy}
                          className="scale-90"
                          {...bindTouchHandle({ kind: 'volume', id: volume.id }, volume.title)}
                        />
                      ) : null}
                      <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {volume.title}
                        <span className="ml-1.5 font-normal normal-case tabular-nums">
                          {volumeChapters.length} 章
                        </span>
                      </p>
                      {reorderMode && volumes.length > 1 ? (
                        <div className="flex shrink-0 items-center">
                          <EditorButton
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="size-7 p-0"
                            disabled={!canMoveVolumeUp || busy}
                            aria-label="上移卷"
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
                            aria-label="下移卷"
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
                        const status =
                          active
                            ? '编辑中'
                            : chapter.wordCount > 0
                              ? `${chapter.wordCount} 字`
                              : '待写'
                        const canMoveUp = index > 0
                        const canMoveDown = index < volumeChapters.length - 1

                        if (reorderMode) {
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
                                title="拖拽移动章节"
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
                                    aria-label="移动到其他卷"
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
                                  aria-label="上移章节"
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
                                  aria-label="下移章节"
                                  onClick={() => void handleMoveChapter(chapter.id, 'down')}
                                >
                                  <ArrowDown className="size-4" />
                                </EditorButton>
                              </div>
                            </li>
                          )
                        }

                        return (
                          <li key={chapter.id}>
                            <button
                              type="button"
                              onClick={() => void selectChapter(chapter.id)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                                active
                                  ? 'border-primary/45 bg-primary/10 shadow-sm'
                                  : 'border-border/60 bg-background/90 active:bg-muted/60',
                              )}
                            >
                              <span
                                className={cn(
                                  'shrink-0 text-[11px] font-semibold tabular-nums',
                                  active ? 'text-primary' : 'text-muted-foreground',
                                )}
                              >
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={cn(
                                  'min-w-0 flex-1 truncate text-sm font-medium',
                                  active ? 'text-primary' : 'text-foreground',
                                )}
                              >
                                {chapter.title}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">{status}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    {!reorderMode ? (
                      <EditorButton
                        variant="dashed"
                        size="sm"
                        fullWidth
                        type="button"
                        className="mt-1.5 h-8 text-xs"
                        onClick={() => void addChapter('新章节', volume.id)}
                      >
                        <Plus className="size-3.5" />
                        本卷新增
                      </EditorButton>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
