import { cn } from '@/lib/utils'
import { AuthSpinner } from './AuthSpinner'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingText?: string
}

export function AuthSubmitButton({
  loading = false,
  loadingText = '处理中…',
  children,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'mkt-cta-glow relative h-11 w-full rounded-full bg-primary font-medium text-primary-foreground',
        'hover:bg-primary-hover',
        'transition-all duration-200 ease-out',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',
        'active:scale-[0.99]',
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
            <AuthSpinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />
            {loadingText}
          </>
        ) : (
          children
        )}
      </span>
    </button>
  )
}
