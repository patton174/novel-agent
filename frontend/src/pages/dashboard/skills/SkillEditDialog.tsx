import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentSkillDetail } from '@/types/agentSkill'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'

export interface SkillEditDialogProps {
  open: boolean
  skill: AgentSkillDetail | null
  readOnly?: boolean
  saving?: boolean
  /** i18n namespace for dialog labels — `dashboard` (default) or `admin` */
  i18nNamespace?: 'dashboard' | 'admin'
  onOpenChange: (open: boolean) => void
  onSave: (values: {
    name: string
    description: string
    content: string
    locale: string
  }) => void | Promise<void>
}

export function SkillEditDialog({
  open,
  skill,
  readOnly = false,
  saving = false,
  i18nNamespace = 'dashboard',
  onOpenChange,
  onSave,
}: SkillEditDialogProps) {
  const { t } = useTranslation([i18nNamespace])
  const skillKey = (key: string) => `${i18nNamespace}:skills.${key}` as const
  const isCreate = !skill
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [locale, setLocale] = useState('zh')

  useEffect(() => {
    if (!open) return
    setName(skill?.name ?? '')
    setDescription(skill?.description ?? '')
    setContent(skill?.content ?? '')
    setLocale(skill?.locale ?? 'zh')
  }, [open, skill])

  const handleSubmit = () => {
    if (readOnly || !name.trim() || !content.trim()) return
    void onSave({
      name: name.trim(),
      description: description.trim(),
      content: content.trim(),
      locale,
    })
  }

  const title = readOnly
    ? t(skillKey('viewTitle'), { name: skill?.name })
    : isCreate
      ? t(skillKey('createTitle'))
      : t(skillKey('editTitle'), { name: skill?.name })

  return (
    <AppModalShell open={open} onOpenChange={onOpenChange} size="form" title={title}>
      <div className="space-y-4 overflow-y-auto px-1 py-2">
        <div className="space-y-2">
          <label htmlFor="skill-name" className="text-xs font-medium text-muted-foreground">
            {t(skillKey('fieldName'))}
          </label>
          <Input
            id="skill-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly || !isCreate}
            placeholder={t(skillKey('fieldNamePlaceholder'))}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="skill-description" className="text-xs font-medium text-muted-foreground">
            {t(skillKey('fieldDescription'))}
          </label>
          <Input
            id="skill-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
            placeholder={t(skillKey('fieldDescriptionPlaceholder'))}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="skill-locale" className="text-xs font-medium text-muted-foreground">
            {t(skillKey('fieldLocale'))}
          </label>
          <Select value={locale} onValueChange={setLocale} disabled={readOnly}>
            <SelectTrigger id="skill-locale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">{t(skillKey('localeZh'))}</SelectItem>
              <SelectItem value="en">{t(skillKey('localeEn'))}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="skill-content" className="text-xs font-medium text-muted-foreground">
            {t(skillKey('fieldContent'))}
          </label>
          <textarea
            id="skill-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={readOnly}
            rows={12}
            className={cn(
              'w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm',
              'outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
            placeholder={t(skillKey('fieldContentPlaceholder'))}
          />
        </div>
      </div>

      <DialogFooter className="mt-2 gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          className={APP_BTN_MD}
          onClick={() => onOpenChange(false)}
        >
          {readOnly ? t(skillKey('close')) : t(skillKey('cancel'))}
        </Button>
        {!readOnly ? (
          <Button
            type="button"
            className={APP_BTN_MD}
            disabled={saving || !name.trim() || !content.trim()}
            onClick={handleSubmit}
          >
            {saving ? t(skillKey('saving')) : t(skillKey('save'))}
          </Button>
        ) : null}
      </DialogFooter>
    </AppModalShell>
  )
}
