import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Switch } from '../ui/switch'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_CARD } from '@/lib/editorPixelClasses'

interface EditorSettingsModalProps {
  open: boolean
  onClose: () => void
  hostModeEnabled: boolean
  onHostModeChange: (enabled: boolean) => void
}

/** Editor preferences only — account lives in EditorUserModal. */
export function EditorSettingsModal({
  open,
  onClose,
  hostModeEnabled,
  onHostModeChange,
}: EditorSettingsModalProps) {
  const { t } = useTranslation(['editor', 'common'])

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="settings"
      title={t('editor:settings.title')}
      description={t('editor:settings.preferenceDesc')}
      className="sm:max-w-[480px]"
      bodyClassName="space-y-4 pb-1"
    >
      <section className="flex flex-col gap-3">
        <div
          className={cn(
            EDITOR_PIXEL_CARD,
            'flex items-center justify-between gap-4 p-3 font-mono',
            'max-md:flex-col max-md:items-stretch max-md:gap-2.5',
          )}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">{t('common:glossary.hostMode')}</span>
            <span className="text-xs leading-snug text-muted-foreground">
              {t('editor:settings.hostModeDesc')}
            </span>
          </div>
          <Switch
            checked={hostModeEnabled}
            onCheckedChange={onHostModeChange}
            aria-label={t('common:glossary.hostMode')}
            className="shrink-0 self-end max-md:self-start"
          />
        </div>
      </section>

      <div className="border-t border-border/60 pt-4">
        <Link
          to="/dashboard/settings/profile"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          {t('editor:settings.fullSettings')}
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </AppModalShell>
  )
}
