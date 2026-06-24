import { useEffect, useState } from 'react'
import { fetchAvailableModels } from '@/api/modelApi'
import type { AvailableModels } from '@/types/model'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface ModelSelectorProps {
  value?: string | null
  onChange: (userModelId: string | null) => void
  type?: string
  compact?: boolean
  disabled?: boolean
  className?: string
}

/** 模型下拉：公共模型 + BYOK；value 为空 = 平台/用户默认，pub: 前缀 = 临时公共模型 */
export function ModelSelector({
  value,
  onChange,
  type = 'llm',
  compact = false,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const { t } = useTranslation(['dashboard', 'editor'])
  const [data, setData] = useState<AvailableModels | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchAvailableModels(type)
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch(() => {
        if (!cancelled) {
          setData({ publicModels: [], byok: [] })
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [type])

  const empty = !data?.publicModels.length && !data?.byok.length

  return (
    <select
      value={value ?? ''}
      disabled={disabled || loading}
      aria-label={t('editor:chat.modelLabel')}
      title={failed ? t('editor:chat.modelLoadFailed') : t('editor:chat.modelLabel')}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        'border-2 border-foreground bg-background text-foreground shadow-[1px_1px_0_0_var(--foreground)]',
        'font-mono font-bold outline-none transition-colors',
        'hover:bg-neon/20 focus-visible:ring-2 focus-visible:ring-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        compact
          ? 'h-8 max-w-[10.5rem] truncate px-2 text-[11px] normal-case'
          : 'h-9 min-w-[12rem] max-w-full px-3 text-sm normal-case',
        className,
      )}
    >
      <option value="">{t('dashboard:model.platformDefault')}</option>
      {empty && !loading ? (
        <option value="" disabled>
          {failed ? t('editor:chat.modelUnavailable') : t('editor:chat.modelEmpty')}
        </option>
      ) : null}
      {data?.publicModels.length ? (
        <optgroup label={t('dashboard:model.public')}>
          {data.publicModels.map((m) => (
            <option key={m.id} value={`pub:${m.id}`}>
              {m.displayName}
              {m.priceMultiplier !== 1 ? ` (×${m.priceMultiplier})` : ''}
            </option>
          ))}
        </optgroup>
      ) : null}
      {data?.byok.length ? (
        <optgroup label={t('dashboard:model.byokTitle')}>
          {data.byok.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label || m.modelName || m.id} ({t('dashboard:model.byokBadge')})
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  )
}
