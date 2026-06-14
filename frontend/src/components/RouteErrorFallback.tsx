import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NovelAiWordmark } from '@/components/marketing/NovelAiWordmark'
import { MKT_CTA_PRIMARY, MKT_CTA_SECONDARY } from '@/lib/marketingCta'
import { MARKETING_BACKGROUND_PATTERN } from '@/lib/marketingShellClasses'
import { cn } from '@/lib/utils'

export interface RouteErrorFallbackProps {
  chunkError: boolean
  message?: string
  onRetry: () => void
}

export function RouteErrorFallback({ chunkError, message, onRetry }: RouteErrorFallbackProps) {
  const { t } = useTranslation('common')

  const title = chunkError
    ? t('feedback.errorPageUpdated')
    : t('feedback.errorPageFailed')
  const description = chunkError
    ? t('feedback.errorPageUpdatedDesc')
    : message || t('feedback.errorPageUnknown')

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div className={cn(MARKETING_BACKGROUND_PATTERN, 'opacity-90')} aria-hidden />
      <div className="mkt-grid-bg pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
      <div
        className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-12 size-64 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/15"
        aria-hidden
      />

      <div className="relative z-[1] flex w-full max-w-[28rem] flex-col items-center">
        <NovelAiWordmark size="md" animate={false} className="mb-8" />

        <div
          className={cn(
            'w-full rounded-2xl border border-border/80 bg-surface/90 p-7 text-center shadow-lg backdrop-blur-md',
            'dark:border-border/60 dark:bg-surface/80 dark:shadow-[0_24px_64px_-24px_rgba(2,6,23,0.75)]',
          )}
          role="alert"
        >
          <div
            className={cn(
              'mx-auto mb-5 inline-flex size-12 items-center justify-center rounded-2xl border',
              chunkError
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-destructive/20 bg-destructive/10 text-destructive',
            )}
          >
            {chunkError ? (
              <RefreshCw className="size-5 motion-safe:animate-[spin_3s_linear_infinite]" aria-hidden />
            ) : (
              <AlertTriangle className="size-5" aria-hidden />
            )}
          </div>

          <h1 className="mb-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{description}</p>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button type="button" onClick={onRetry} className={cn(MKT_CTA_PRIMARY, 'min-w-[9.5rem]')}>
              <RefreshCw className="size-4" aria-hidden />
              {t('feedback.errorPageRefresh')}
            </button>
            <a href="/" className={cn(MKT_CTA_SECONDARY, 'min-w-[9.5rem] no-underline')}>
              {t('feedback.errorPageGoHome')}
            </a>
          </div>

          {chunkError ? (
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground/90">
              {t('feedback.errorPageUpdatedTip')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
