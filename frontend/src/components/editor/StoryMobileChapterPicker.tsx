import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useNovelStore } from '@/stores/novelStore'
import { sortChapters } from '@/utils/outlineDrag'
import { promptDialog } from '@/stores/confirmDialogStore'
import { EditorButton } from '@/components/ui/EditorButton'
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

  const volumeGroups = useMemo(
    () =>
      volumes.map((volume) => ({
        volume,
        chapters: sortChapters(chapters.filter((c) => c.volumeId === volume.id)),
      })),
    [volumes, chapters],
  )

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

  return (
    <div className="flex min-h-[9rem] max-h-[38vh] shrink-0 flex-col border-b border-border/70 bg-muted/20">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground">章节 · 点选即写</p>
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
            {volumeGroups.map(({ volume, chapters: volumeChapters }) => (
              <div key={volume.id}>
                <p className="sticky top-0 z-[1] bg-muted/90 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                  {volume.title}
                  <span className="ml-1.5 font-normal normal-case tabular-nums">{volumeChapters.length} 章</span>
                </p>
                <ul className="mt-1 space-y-1">
                  {volumeChapters.map((chapter, index) => {
                    const active = chapter.id === activeChapterId
                    const status =
                      active
                        ? '编辑中'
                        : chapter.wordCount > 0
                          ? `${chapter.wordCount} 字`
                          : '待写'
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
