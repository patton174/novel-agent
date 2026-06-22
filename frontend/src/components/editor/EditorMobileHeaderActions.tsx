import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { ProIconOverview } from '@/components/pro/icons/proIcons'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { cn } from '@/lib/utils'

export function EditorMobileHeaderActions() {
  const { t } = useTranslation(['editor'])

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        to="/dashboard"
        aria-label={t('editor:chrome.backToDashboard')}
        title={t('editor:chrome.backToDashboard')}
        className={cn(editorPixelIconButtonClass(), 'inline-flex size-8 shrink-0 items-center justify-center')}
      >
        <ProIconOverview size={16} />
      </Link>
      <ThemeToggle compact />
      <LocaleToggle compact />
    </div>
  )
}
