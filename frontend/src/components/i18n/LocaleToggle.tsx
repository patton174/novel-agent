import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
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
      className={cn(
        editorPixelIconButtonClass(),
        compact ? 'size-8' : 'h-9 px-3 text-sm font-medium normal-case',
        className,
      )}
    >
      <Globe className="size-4 shrink-0" />
      {compact ? <span className="sr-only">{isEn ? 'EN' : '中文'}</span> : (
        <span>{isEn ? 'EN' : '中文'}</span>
      )}
    </button>
  )
}
