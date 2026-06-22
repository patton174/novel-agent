import { useEffect, useRef } from 'react'
import { loadTurnstileScript, type TurnstilePublicConfig } from '@/utils/turnstile'

interface Props {
  config: TurnstilePublicConfig | null
  onTokenChange: (token: string | null) => void
  onLoadError?: () => void
  resetKey?: string | number
  className?: string
}

export function TurnstileWidget({ config, onTokenChange, onLoadError, resetKey, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const enabled = Boolean(config?.turnstileEnabled && config.turnstileSiteKey)

  useEffect(() => {
    if (!enabled || !config?.turnstileSiteKey) {
      onTokenChange(null)
      return
    }

    let cancelled = false
    onTokenChange(null)

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return
        }
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
        containerRef.current.innerHTML = ''
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: config.turnstileSiteKey,
          theme: 'auto',
          callback: (token) => onTokenChange(token),
          'expired-callback': () => onTokenChange(null),
          'error-callback': () => {
            onTokenChange(null)
            onLoadError?.()
          },
        })
      })
      .catch(() => {
        onTokenChange(null)
        onLoadError?.()
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [config?.turnstileSiteKey, enabled, onLoadError, onTokenChange, resetKey])

  if (!enabled) {
    return null
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="min-h-[65px]" />
    </div>
  )
}
