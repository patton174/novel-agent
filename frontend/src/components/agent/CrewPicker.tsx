import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchCrewTemplates } from '@/api/crewApi'
import type { CrewTemplateSummary } from '@/types/crew'

interface Props {
  open: boolean
  query: string
  selected: CrewTemplateSummary | null
  onPick: (crew: CrewTemplateSummary) => void
  onClose: () => void
}

export function CrewPicker({ open, query, selected, onPick, onClose }: Props) {
  const { t } = useTranslation(['editor'])
  const [crews, setCrews] = useState<CrewTemplateSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchCrewTemplates()
      .then((list) => {
        if (!cancelled) setCrews(list)
      })
      .catch(() => {
        if (!cancelled) setCrews([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  const q = query.trim().toLowerCase()
  const filtered = q
    ? crews.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false) ||
          c.id.toLowerCase().includes(q),
      )
    : crews

  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
        {t('editor:crew.pickTitle')}
      </div>
      {loading ? (
        <Loader2 className="m-3 size-4 animate-spin" />
      ) : filtered.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">{t('editor:crew.empty')}</div>
      ) : (
        filtered.map((crew) => {
          const picked = selected?.id === crew.id
          return (
            <button
              key={crew.id}
              type="button"
              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/40"
              onClick={() => {
                onPick(crew)
                onClose()
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{crew.displayName}</span>
                {picked ? (
                  <span className="shrink-0 text-xs text-primary">{t('editor:crew.selected')}</span>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t('editor:crew.stageCount', { count: crew.stageCount })}
                  </span>
                )}
              </span>
              {crew.description ? (
                <span className="truncate text-xs text-muted-foreground">{crew.description}</span>
              ) : null}
            </button>
          )
        })
      )}
    </div>
  )
}
