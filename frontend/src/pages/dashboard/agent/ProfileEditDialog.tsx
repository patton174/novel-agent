import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentSkillSummary } from '@/types/agentSkill'
import type { AgentProfileDetail } from '@/types/agentProfile'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogFooter } from '@/components/ui/dialog'
import { fetchAgentSkills } from '@/api/agentSkillApi'
import { AGENT_TOOLS } from '@/constants/agentTools'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'

export interface ProfileEditDialogProps {
  open: boolean
  profile: AgentProfileDetail | null
  readOnly?: boolean
  saving?: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: {
    displayName: string
    description: string
    systemPromptTemplate: string
    toolAllowlist: string[]
    maxTurns: number
    skillIds: string[]
  }) => void | Promise<void>
}

export function ProfileEditDialog({
  open,
  profile,
  readOnly = false,
  saving = false,
  onOpenChange,
  onSave,
}: ProfileEditDialogProps) {
  const { t } = useTranslation(['dashboard'])
  const isCreate = !profile
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPromptTemplate, setSystemPromptTemplate] = useState('')
  const [toolAllowlist, setToolAllowlist] = useState<string[]>([])
  const [maxTurns, setMaxTurns] = useState(20)
  const [skillIds, setSkillIds] = useState<string[]>([])
  const [skills, setSkills] = useState<AgentSkillSummary[]>([])

  useEffect(() => {
    if (!open) return
    setDisplayName(profile?.displayName ?? '')
    setDescription(profile?.description ?? '')
    setSystemPromptTemplate(profile?.systemPromptTemplate ?? '')
    setToolAllowlist(profile?.toolAllowlist ?? [])
    setMaxTurns(profile?.maxTurns ?? 20)
    setSkillIds(profile?.skillIds ?? [])
    void fetchAgentSkills()
      .then(setSkills)
      .catch(() => setSkills([]))
  }, [open, profile])

  const toggleTool = (tool: string) => {
    if (readOnly) return
    setToolAllowlist((prev) =>
      prev.includes(tool) ? prev.filter((x) => x !== tool) : [...prev, tool],
    )
  }

  const toggleSkill = (id: string) => {
    if (readOnly) return
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = () => {
    if (readOnly || !displayName.trim() || !systemPromptTemplate.trim()) return
    void onSave({
      displayName: displayName.trim(),
      description: description.trim(),
      systemPromptTemplate: systemPromptTemplate.trim(),
      toolAllowlist,
      maxTurns,
      skillIds,
    })
  }

  const title = readOnly
    ? t('dashboard:agentProfiles.viewTitle', { name: profile?.displayName })
    : isCreate
      ? t('dashboard:agentProfiles.createTitle')
      : t('dashboard:agentProfiles.editTitle', { name: profile?.displayName })

  return (
    <AppModalShell open={open} onOpenChange={onOpenChange} size="form" title={title}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto px-1 py-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:agentProfiles.fieldDisplayName')}
          </label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={readOnly}
            placeholder={t('dashboard:agentProfiles.fieldDisplayNamePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:agentProfiles.fieldDescription')}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:agentProfiles.fieldSystemPrompt')}
          </label>
          <textarea
            value={systemPromptTemplate}
            onChange={(e) => setSystemPromptTemplate(e.target.value)}
            disabled={readOnly}
            rows={8}
            className={cn(
              'w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t('dashboard:agentProfiles.fieldMaxTurns')}
          </label>
          <Input
            type="number"
            min={1}
            max={60}
            value={maxTurns}
            onChange={(e) => setMaxTurns(Number(e.target.value) || 20)}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t('dashboard:agentProfiles.fieldToolAllowlist')}
          </div>
          <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md border border-input p-2">
            {AGENT_TOOLS.map((tool) => {
              const picked = toolAllowlist.includes(tool)
              return (
                <button
                  key={tool}
                  type="button"
                  disabled={readOnly}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs',
                    picked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                  onClick={() => toggleTool(tool)}
                >
                  {tool}
                </button>
              )
            })}
          </div>
        </div>

        {skills.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              {t('dashboard:agentProfiles.fieldSkills')}
            </div>
            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto rounded-md border border-input p-2">
              {skills.map((skill) => {
                const picked = skillIds.includes(skill.id)
                return (
                  <button
                    key={skill.id}
                    type="button"
                    disabled={readOnly}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs',
                      picked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                    onClick={() => toggleSkill(skill.id)}
                  >
                    {skill.name}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <DialogFooter className="mt-2 gap-2 sm:gap-2">
        <Button type="button" variant="outline" className={APP_BTN_MD} onClick={() => onOpenChange(false)}>
          {readOnly ? t('dashboard:agentProfiles.close') : t('dashboard:agentProfiles.cancel')}
        </Button>
        {!readOnly ? (
          <Button
            type="button"
            className={APP_BTN_MD}
            disabled={saving || !displayName.trim() || !systemPromptTemplate.trim()}
            onClick={handleSubmit}
          >
            {saving ? t('dashboard:agentProfiles.saving') : t('dashboard:agentProfiles.save')}
          </Button>
        ) : null}
      </DialogFooter>
    </AppModalShell>
  )
}
