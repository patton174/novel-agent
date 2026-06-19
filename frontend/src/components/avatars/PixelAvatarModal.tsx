import { useTranslation } from 'react-i18next'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogTitle } from '@/components/ui/dialog'
import { PixelAvatarPicker } from './PixelAvatarPicker'

export interface PixelAvatarModalProps {
  open: boolean
  onClose: () => void
}

export function PixelAvatarModal({ open, onClose }: PixelAvatarModalProps) {
  const { t } = useTranslation(['editor'])

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="settings"
      className="sm:max-w-[520px]"
      header={
        <div className="border-b border-border/60 px-4 pb-3 pt-1">
          <DialogTitle className="m-0 text-[17px] font-bold text-foreground">
            {t('editor:avatar.modalTitle')}
          </DialogTitle>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('editor:avatar.modalDesc')}</p>
        </div>
      }
      bodyClassName="pb-2 pt-1"
    >
      <PixelAvatarPicker embedded />
    </AppModalShell>
  )
}
