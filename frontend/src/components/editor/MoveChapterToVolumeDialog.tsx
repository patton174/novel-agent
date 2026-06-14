import { useTranslation } from 'react-i18next'
import { AppModalShell } from '@/components/ui/AppModalShell'
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
  const { t } = useTranslation(['editor'])
  const targets = volumes.filter((volume) => volume.id !== currentVolumeId)

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="confirm"
      title={t('editor:moveDialog.title')}
      description={t('editor:moveDialog.desc', { title: chapterTitle })}
    >
      {targets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('editor:moveDialog.noOtherVolumes')}</p>
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
    </AppModalShell>
  )
}
