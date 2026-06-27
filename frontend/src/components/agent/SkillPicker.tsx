import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchAgentSkillLibrary } from '@/api/agentSkillApi'
import type { AgentSkillSummary } from '@/types/agentSkill'

interface Props {
  open: boolean
  query: string
  selected: AgentSkillSummary[]
  maxSelected?: number
  onPick: (skill: AgentSkillSummary) => void
  onClose: () => void
}

export function SkillPicker({
  open,
  query,
  selected,
  maxSelected = 3,
  onPick,
  onClose,
}: Props) {
  const { t } = useTranslation(['editor'])
  const [skills, setSkills] = useState<AgentSkillSummary[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchAgentSkillLibrary()
      .then((list) => {
        if (!cancelled) setSkills(list.filter((s) => s.enabled !== false))
      })
      .catch(() => {
        if (!cancelled) setSkills([])
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
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false),
      )
    : skills

  const selectedIds = new Set(selected.map((s) => s.id))

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
    >
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
        {t('editor:skill.pickTitle', { count: selected.length, max: maxSelected })}
      </div>
      {loading ? (
        <Loader2 className="m-3 size-4 animate-spin" />
      ) : filtered.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">{t('editor:skill.empty')}</div>
      ) : (
        filtered.map((skill) => {
          const picked = selectedIds.has(skill.id)
          const disabled = !picked && selected.length >= maxSelected
          return (
            <button
              key={skill.id}
              type="button"
              disabled={disabled}
              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                if (disabled) return
                onPick(skill)
                if (selected.length + 1 >= maxSelected || picked) {
                  onClose()
                }
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {skill.name}
                  {skill.isSystem ? (
                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                      v{skill.pinnedVersion ?? skill.version}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {skill.updateAvailable ? (
                    <span className="size-1.5 rounded-full bg-amber-500" title={t('editor:skill.updateAvailable')} />
                  ) : null}
                  {picked ? (
                    <span className="text-xs text-primary">{t('editor:skill.selected')}</span>
                  ) : null}
                </span>
              </span>
              {skill.description ? (
                <span className="truncate text-xs text-muted-foreground">{skill.description}</span>
              ) : null}
            </button>
          )
        })
      )}
    </div>
  )
}
