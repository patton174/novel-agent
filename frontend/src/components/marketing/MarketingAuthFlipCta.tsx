import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { MKT_CTA_PRIMARY } from '@/lib/marketingCta'

const FLIP_MS = 2500

interface MarketingAuthFlipCtaProps {
  className?: string
  /** sm = 顶栏移动端；md = 桌面导航 */
  size?: 'sm' | 'md'
  fullWidth?: boolean
  /** icon = 移动端仅图标；text = 文字翻转 */
  variant?: 'text' | 'icon'
}

export function MarketingAuthFlipCta({
  className,
  size = 'md',
  fullWidth = false,
  variant = 'text',
}: MarketingAuthFlipCtaProps) {
  const { t } = useTranslation(['marketing', 'common'])
  const reduced = useReducedMotion()
  const [showRegister, setShowRegister] = useState(true)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setShowRegister((v) => !v), FLIP_MS)
    return () => window.clearInterval(id)
  }, [reduced])

  const loginLabel = t('marketing:nav.login')
  const registerLabel = t('common:cta.registerFree')

  if (reduced) {
    if (variant === 'icon') {
      return (
        <Link
          to="/register"
          className={cn(
            'inline-flex size-9 items-center justify-center border-2 border-foreground bg-primary text-white shadow-soft',
            className,
          )}
          aria-label={registerLabel}
        >
          <UserPlus className="size-4" strokeWidth={2.5} />
        </Link>
      )
    }
    return (
      <Link
        to="/register"
        className={cn(MKT_CTA_PRIMARY, size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm', className)}
      >
        {registerLabel}
      </Link>
    )
  }

  if (variant === 'icon') {
    const label = showRegister ? registerLabel : loginLabel
    const Icon = showRegister ? UserPlus : LogIn
    return (
      <div
        className={cn('mkt-auth-flip-icon relative size-9 overflow-hidden border-2 border-foreground shadow-soft', className)}
        aria-live="polite"
      >
        <div
          className="mkt-auth-flip-track flex h-[200%] flex-col"
          style={{ transform: showRegister ? 'translateY(-50%)' : 'translateY(0%)' }}
        >
          <Link
            to="/login?returnTo=%2Fdashboard"
            className="flex h-9 w-9 items-center justify-center bg-surface text-foreground hover:bg-neon"
            aria-label={loginLabel}
            tabIndex={showRegister ? -1 : 0}
            aria-hidden={showRegister}
          >
            <LogIn className="size-4" strokeWidth={2.5} />
          </Link>
          <Link
            to="/register"
            className="flex h-9 w-9 items-center justify-center bg-primary text-white hover:bg-neon hover:text-ink"
            aria-label={registerLabel}
            tabIndex={showRegister ? 0 : -1}
            aria-hidden={!showRegister}
          >
            <UserPlus className="size-4" strokeWidth={2.5} />
          </Link>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  const itemClass = cn(
    'flex h-full w-full items-center justify-center whitespace-nowrap font-mono font-bold uppercase tracking-wide transition-colors',
    size === 'sm' ? 'px-3 text-[0.68rem]' : 'px-4 text-sm',
  )

  return (
    <div
      className={cn(
        'mkt-auth-flip overflow-hidden border-2 border-foreground shadow-soft',
        size === 'sm' ? 'h-9' : 'h-10',
        fullWidth ? 'w-full' : size === 'sm' ? 'w-[8.5rem]' : 'w-[9.5rem]',
        className,
      )}
      aria-live="polite"
    >
      <div
        className="mkt-auth-flip-track flex h-[200%] flex-col"
        style={{ transform: showRegister ? 'translateY(-50%)' : 'translateY(0%)' }}
      >
        <Link
          to="/login?returnTo=%2Fdashboard"
          className={cn(itemClass, 'bg-surface text-foreground hover:bg-neon')}
          tabIndex={showRegister ? -1 : 0}
          aria-hidden={showRegister}
        >
          {loginLabel}
        </Link>
        <Link
          to="/register"
          className={cn(itemClass, 'bg-primary text-white hover:bg-neon hover:text-ink')}
          tabIndex={showRegister ? 0 : -1}
          aria-hidden={!showRegister}
        >
          {registerLabel}
        </Link>
      </div>
    </div>
  )
}
