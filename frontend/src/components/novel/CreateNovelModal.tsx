import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import type { CreateNovelPayload } from '../../types/novel'
import { suggestNovelDescriptionPrompt } from '@/api/dashboardApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '../ui/button'
import { editorFieldClass, editorTextareaClass } from '@/lib/editorFieldClasses'
import {
  getNovelGenreOptions,
  getNovelTagPresets,
  applyNovelDraftSuggestion,
  assembleNovelDescription,
  buildDraftPayload,
  emptyNovelDraftForm,
  hasDraftContent,
  type NovelDraftForm,
} from '@/lib/novelDraft'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_CARD_INSET } from '@/lib/editorPixelClasses'
import { appToast } from '@/stores/appToastStore'

const HOOK_MAX = 30
const PROTAGONIST_MAX = 80

interface CreateNovelModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: CreateNovelPayload) => Promise<void>
}

const SECTION_CLASS = cn(EDITOR_PIXEL_CARD_INSET, 'space-y-2.5')

const LABEL_CLASS = 'font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground'
const HINT_CLASS = 'text-[11px] leading-snug text-muted-foreground/80'

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={LABEL_CLASS}>{children}</span>
      {hint ? <span className={HINT_CLASS}>{hint}</span> : null}
    </div>
  )
}

export const CreateNovelModal: React.FC<CreateNovelModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation(['editor'])
  const [form, setForm] = useState<NovelDraftForm>(emptyNovelDraftForm)
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | undefined>()
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiOptimizing, setAiOptimizing] = useState(false)

  const patchForm = useCallback((patch: Partial<NovelDraftForm>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetForm = () => {
    setForm(emptyNovelDraftForm())
    setTitleError(undefined)
  }

  const runAi = async (mode: 'generate' | 'optimize') => {
    if (aiGenerating || aiOptimizing) return
    if (mode === 'generate' && !form.title.trim() && !form.tags.trim()) {
      appToast.error(t('editor:createNovel.toastNeedTitleOrTags'))
      return
    }
    if (mode === 'optimize' && !hasDraftContent(form)) {
      appToast.error(t('editor:createNovel.toastNeedContent'))
      return
    }
    const setBusy = mode === 'generate' ? setAiGenerating : setAiOptimizing
    setBusy(true)
    try {
      const suggested = await suggestNovelDescriptionPrompt(
        buildDraftPayload(form, mode),
      )
      if (suggested) {
        setForm((prev) => ({
          ...applyNovelDraftSuggestion(prev, suggested),
          hook: suggested.hook.slice(0, HOOK_MAX),
          protagonist: suggested.protagonist.slice(0, PROTAGONIST_MAX),
        }))
        appToast.success(mode === 'generate' ? t('editor:createNovel.toastGenerateOk') : t('editor:createNovel.toastOptimizeOk'))
      } else {
        appToast.error(mode === 'generate' ? t('editor:createNovel.toastGenerateFail') : t('editor:createNovel.toastOptimizeFail'))
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('editor:createNovel.toastRequestFail'))
    } finally {
      setBusy(false)
    }
  }

  const toggleTag = (tag: string) => {
    const parts = form.tags
      .split(/[\s,，、]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    const idx = parts.indexOf(tag)
    if (idx >= 0) {
      parts.splice(idx, 1)
    } else {
      parts.push(tag)
    }
    patchForm({ tags: parts.join(' ') })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setTitleError(t('editor:createNovel.titleRequired'))
      return
    }
    setTitleError(undefined)
    setSubmitting(true)
    try {
      const description =
        assembleNovelDescription(form) || form.synopsis.trim() || undefined
      const styleCombined = [form.style.trim(), form.tags.trim()]
        .filter(Boolean)
        .join(' · ')
      await onSubmit({
        title: form.title.trim(),
        description,
        genre: form.genre.trim() || undefined,
        style: styleCombined || undefined,
        targetChapterWords: form.targetChapterWords || 3000,
      })
      resetForm()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const aiBusy = aiGenerating || aiOptimizing

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
      size="detail"
      title={t('editor:createNovel.title')}
      description={t('editor:createNovel.description')}
      bodyClassName="flex min-h-0 flex-1 flex-col pt-1"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5">
        <div className="flex flex-col gap-2 border-2 border-foreground bg-neon/15 px-3 py-2 shadow-[2px_2px_0_0_var(--foreground)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t('editor:createNovel.aiBanner')}
          </p>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={submitting || aiBusy}
              onClick={() => void runAi('generate')}
            >
              {aiGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {t('editor:createNovel.aiGenerate')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={submitting || aiBusy || !hasDraftContent(form)}
              onClick={() => void runAi('optimize')}
            >
              {aiOptimizing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wand2 className="size-3.5" />
              )}
              {t('editor:createNovel.aiOptimize')}
            </Button>
          </div>
        </div>

        <section className={SECTION_CLASS}>
          <p className="text-sm font-semibold text-foreground">{t('editor:createNovel.sectionBasic')}</p>
          <label className="flex flex-col gap-1.5">
            <FieldLabel hint={t('editor:createNovel.titleHint')}>{t('editor:createNovel.titleLabel')}</FieldLabel>
            <input
              value={form.title}
              aria-invalid={titleError ? true : undefined}
              onChange={(e) => {
                patchForm({ title: e.target.value })
                if (titleError) setTitleError(undefined)
              }}
              placeholder={t('editor:createNovel.titlePlaceholder')}
              disabled={aiBusy}
              className={cn(
                editorFieldClass,
                titleError &&
                  'border-destructive/60 focus:border-destructive/60 focus:ring-destructive/20',
              )}
            />
            {titleError ? (
              <span className="text-[11px] leading-snug text-destructive">{titleError}</span>
            ) : null}
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <FieldLabel hint={t('editor:createNovel.genreHint')}>{t('editor:createNovel.genreLabel')}</FieldLabel>
              <input
                list="novel-genre-options"
                value={form.genre}
                onChange={(e) => patchForm({ genre: e.target.value })}
                placeholder={t('editor:createNovel.genrePlaceholder')}
                disabled={aiBusy}
                className={editorFieldClass}
              />
              <datalist id="novel-genre-options">
                {getNovelGenreOptions().map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel hint={t('editor:createNovel.styleHint')}>{t('editor:createNovel.styleLabel')}</FieldLabel>
              <input
                value={form.style}
                onChange={(e) => patchForm({ style: e.target.value })}
                placeholder={t('editor:createNovel.stylePlaceholder')}
                disabled={aiBusy}
                className={editorFieldClass}
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel hint={t('editor:createNovel.tagsHint')}>{t('editor:createNovel.tagsLabel')}</FieldLabel>
            <input
              value={form.tags}
              onChange={(e) => patchForm({ tags: e.target.value })}
              placeholder={t('editor:createNovel.tagsPlaceholder')}
              disabled={aiBusy}
              className={editorFieldClass}
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {getNovelTagPresets().map((tag) => {
                const active = form.tags.split(/[\s,，、]+/).includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={aiBusy}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'border-2 border-foreground px-2 py-0.5 font-mono text-[11px] transition-colors',
                      active
                        ? 'bg-neon text-ink shadow-[1px_1px_0_0_var(--foreground)]'
                        : 'bg-background text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className={SECTION_CLASS}>
          <p className="text-sm font-semibold text-foreground">{t('editor:createNovel.sectionSelling')}</p>
          <label className="flex flex-col gap-1.5">
            <FieldLabel hint={t('editor:createNovel.hookHint')}>{t('editor:createNovel.hookLabel')}</FieldLabel>
            <input
              value={form.hook}
              maxLength={HOOK_MAX}
              onChange={(e) => patchForm({ hook: e.target.value.slice(0, HOOK_MAX) })}
              placeholder={t('editor:createNovel.hookPlaceholder')}
              disabled={aiBusy}
              className={editorFieldClass}
            />
            <span className={HINT_CLASS}>{t('editor:createNovel.charCount', { current: form.hook.length, max: HOOK_MAX })}</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel hint={t('editor:createNovel.protagonistHint')}>{t('editor:createNovel.protagonistLabel')}</FieldLabel>
              <textarea
                value={form.protagonist}
                maxLength={PROTAGONIST_MAX}
                onChange={(e) =>
                  patchForm({ protagonist: e.target.value.slice(0, PROTAGONIST_MAX) })
                }
                placeholder={t('editor:createNovel.protagonistPlaceholder')}
                rows={2}
                disabled={aiBusy}
                className={cn(editorTextareaClass, 'min-h-[3.5rem] resize-none')}
              />
              <span className={HINT_CLASS}>{t('editor:createNovel.charCount', { current: form.protagonist.length, max: PROTAGONIST_MAX })}</span>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel>{t('editor:createNovel.sellingPointsLabel')}</FieldLabel>
              <input
                value={form.sellingPoints}
                onChange={(e) => patchForm({ sellingPoints: e.target.value })}
                placeholder={t('editor:createNovel.sellingPointsPlaceholder')}
                disabled={aiBusy}
                className={editorFieldClass}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>{t('editor:createNovel.worldviewLabel')}</FieldLabel>
            <textarea
              value={form.worldview}
              onChange={(e) => patchForm({ worldview: e.target.value })}
              placeholder={t('editor:createNovel.worldviewPlaceholder')}
              rows={3}
              disabled={aiBusy}
              className={cn(editorTextareaClass, 'min-h-[4rem] resize-y')}
            />
          </label>
        </section>

        <section className={SECTION_CLASS}>
          <p className="text-sm font-semibold text-foreground">{t('editor:createNovel.sectionSynopsis')}</p>
          <label className="flex flex-col gap-1.5">
            <FieldLabel hint={t('editor:createNovel.synopsisHint')}>{t('editor:createNovel.synopsisLabel')}</FieldLabel>
            <textarea
              value={form.synopsis}
              onChange={(e) => patchForm({ synopsis: e.target.value })}
              placeholder={t('editor:createNovel.synopsisPlaceholder')}
              rows={4}
              disabled={aiBusy}
              className={cn(editorTextareaClass, 'min-h-[6rem] resize-y')}
            />
            <span className={HINT_CLASS}>
              {t('editor:createNovel.synopsisMeta', { count: form.synopsis.trim().length })}
            </span>
          </label>
        </section>

        <section className={SECTION_CLASS}>
          <p className="text-sm font-semibold text-foreground">{t('editor:createNovel.sectionSerial')}</p>
          <label className="flex flex-col gap-1.5 sm:max-w-[220px]">
            <FieldLabel hint={t('editor:createNovel.chapterWordsHint')}>{t('editor:createNovel.chapterWordsLabel')}</FieldLabel>
            <input
              type="number"
              min={1500}
              max={5000}
              step={100}
              value={form.targetChapterWords}
              onChange={(e) =>
                patchForm({
                  targetChapterWords: Number.parseInt(e.target.value, 10) || 3000,
                })
              }
              disabled={aiBusy}
              className={editorFieldClass}
            />
          </label>
        </section>
        </div>

        <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-border/60 bg-popover pt-3 max-md:flex-col-reverse">
          <Button type="button" variant="ghost" className="max-md:w-full" onClick={onClose}>
            {t('editor:createNovel.cancel')}
          </Button>
          <Button
            type="submit"
            className="max-md:w-full"
            disabled={submitting || !form.title.trim() || aiBusy}
          >
            {submitting ? t('editor:createNovel.submitting') : t('editor:createNovel.submit')}
          </Button>
        </div>
      </form>
    </AppModalShell>
  )
}
