import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

function remainingMs(expiresAt: string): number {
  const end = new Date(expiresAt).getTime()
  if (Number.isNaN(end)) return 0
  return Math.max(0, end - Date.now())
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export function PayExpiresCountdown({
  expiresAt,
  className,
  large,
}: {
  expiresAt: string
  className?: string
  large?: boolean
}) {
  const { t } = useTranslation(['marketing'])
  const [ms, setMs] = useState(() => remainingMs(expiresAt))

  useEffect(() => {
    setMs(remainingMs(expiresAt))
    const id = window.setInterval(() => {
      setMs(remainingMs(expiresAt))
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const expired = ms <= 0

  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        large ? 'text-2xl md:text-3xl' : 'text-sm',
        expired ? 'text-destructive' : 'text-foreground',
        className,
      )}
    >
      {expired ? t('marketing:pricing.checkout.expired') : formatCountdown(ms)}
    </span>
  )
}
