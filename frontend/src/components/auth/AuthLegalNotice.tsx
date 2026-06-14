import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

type Variant = 'register' | 'login' | 'captcha' | 'neutral'

export function AuthLegalNotice({
  variant,
  className,
}: {
  variant: Variant
  className?: string
}) {
  const { t } = useTranslation(['auth'])

  const COPY: Record<Variant, { lead: string; showAi?: boolean }> = {
    register: {
      lead: t('auth:legal.leadRegister'),
    },
    login: {
      lead: t('auth:legal.leadLogin'),
    },
    captcha: {
      lead: t('auth:legal.leadCaptcha'),
      showAi: true,
    },
    neutral: {
      lead: t('auth:legal.leadNeutral'),
    },
  }

  const { lead, showAi } = COPY[variant]

  return (
    <div className={cn('space-y-2 text-xs leading-relaxed text-muted-foreground', className)}>
      <p>
        {lead}
        <Link to="/terms" className="mx-0.5 inline-flex min-h-9 items-center font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline">
          {t('auth:legal.terms')}
        </Link>
        {t('auth:legal.and')}
        <Link to="/privacy" className="mx-0.5 inline-flex min-h-9 items-center font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline">
          {t('auth:legal.privacy')}
        </Link>
        {t('auth:legal.period')}
      </p>
      {showAi ? (
        <p className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs leading-snug">
          <span className="font-medium text-foreground/70">{t('auth:legal.captchaTitle')}</span>
          {t('auth:legal.captchaDesc')}
        </p>
      ) : null}
    </div>
  )
}
