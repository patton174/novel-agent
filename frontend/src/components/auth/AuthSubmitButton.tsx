import { cn } from '@/lib/utils'
import { AppSpinner } from '@/components/loading/AppSpinner'
import { useTranslation } from 'react-i18next'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingText?: string
}

export function AuthSubmitButton({
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  ...rest
}: Props) {
  const { t } = useTranslation(['auth'])
  const resolvedLoadingText = loadingText ?? t('auth:submit.processing')

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'relative h-12 w-full rounded-none border-2 border-foreground bg-primary font-mono text-sm font-bold uppercase tracking-wider text-white shadow-soft',
        'hover:bg-neon hover:text-ink',
        'transition-all duration-150',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'flex items-center justify-center gap-2 transition-opacity duration-200',
          loading ? 'opacity-100' : 'opacity-100',
        )}
      >
        {loading ? (
          <>
            <AppSpinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />
            {resolvedLoadingText}
          </>
        ) : (
          children
        )}
      </span>
    </button>
  )
}
