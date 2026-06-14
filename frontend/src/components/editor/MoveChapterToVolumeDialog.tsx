import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EditorButton } from '@/components/ui/EditorButton'
import type { Volume } from '@/types/novel'

export function MoveChapterToVolumeDialog({
  open,
  chapterTitle,
  currentVolumeId,
  volumes,
  busy,
  onClose,
  onSelectVolume,
}: {
  open: boolean
  chapterTitle: string
  currentVolumeId: string
  volumes: Volume[]
  busy?: boolean
  onClose: () => void
  onSelectVolume: (targetVolumeId: string, position: 'start' | 'end') => void
}) {
  const targets = volumes.filter((volume) => volume.id !== currentVolumeId)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm gap-4">
        <DialogHeader>
          <DialogTitle>移动到其他卷</DialogTitle>
          <DialogDescription className="line-clamp-2">
            「{chapterTitle}」将移动到所选卷的末尾。
          </DialogDescription>
        </DialogHeader>
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">没有其他卷可选。</p>
        ) : (
          <ul className="space-y-2">
            {targets.map((volume) => (
              <li key={volume.id}>
                <EditorButton
                  variant="secondary"
                  fullWidth
                  type="button"
                  disabled={busy}
                  className="h-10 justify-start px-3 text-sm"
                  onClick={() => onSelectVolume(volume.id, 'end')}
                >
                  {volume.title}
                </EditorButton>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
