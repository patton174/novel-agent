import { PixelIcons } from '@/components/icons/PixelIcons'
import { useTranslation } from 'react-i18next'
import { editorPixelToggleButtonClass } from '@/lib/editorPixelClasses'
import { cn } from '@/lib/utils'

import { LOCALE_STORAGE_KEY } from '@/lib/appSessionState'
import { runUiTransition } from '@/lib/uiTransition'

interface LocaleToggleProps {
  compact?: boolean
  className?: string
}

/** 点击在中/英之间切换，避免 Radix Dropdown 在混淆 chunk 内失效 */
export function LocaleToggle({ compact = false, className }: LocaleToggleProps) {
  const { i18n, t } = useTranslation(['common'])
  const isEn = i18n.language.startsWith('en')

  const toggle = () => {
    const next = isEn ? 'zh' : 'en'
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    runUiTransition(() => {
      void i18n.changeLanguage(next)
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('common:locale.label')}
      title={t('common:locale.label')}
      className={cn(editorPixelToggleButtonClass(compact), className)}
    >
      <PixelIcons.Globe />
      {compact ? (
        <span className="sr-only">{isEn ? t('common:locale.en') : t('common:locale.zh')}</span>
      ) : (
        <span>{isEn ? t('common:locale.en') : t('common:locale.zh')}</span>
      )}
    </button>
  )
}
