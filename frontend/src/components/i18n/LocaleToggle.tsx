import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const LOCALE_KEY = 'novel-agent-locale'

const LOCALES = [
  { code: 'zh', labelKey: 'common:locale.zh' },
  { code: 'en', labelKey: 'common:locale.en' },
] as const

interface LocaleToggleProps {
  compact?: boolean
  className?: string
}

export function LocaleToggle({ compact = false, className }: LocaleToggleProps) {
  const { i18n, t } = useTranslation(['common'])
  const current = LOCALES.find((item) => item.code === i18n.language) ?? LOCALES[0]

  const setLocale = (code: string) => {
    try {
      localStorage.setItem(LOCALE_KEY, code)
    } catch {
      /* ignore */
    }
    void i18n.changeLanguage(code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? 'icon-sm' : 'sm'}
          aria-label={t('common:locale.label')}
          className={cn(compact ? 'size-8' : 'h-9 gap-2 px-3', className)}
        >
          <Globe className="size-4" />
          {compact ? (
            <span className="sr-only">{t('common:locale.label')}</span>
          ) : (
            <span>{t(current.labelKey)}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => setLocale(item.code)}
            className={cn(item.code === i18n.language && 'bg-muted font-medium text-foreground')}
          >
            {t(item.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}