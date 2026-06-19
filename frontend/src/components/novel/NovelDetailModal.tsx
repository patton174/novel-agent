import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Sparkles, Trash2, Wand2 } from 'lucide-react'
import type { CreateNovelPayload, Novel } from '../../types/novel'
import { suggestNovelDescriptionPrompt } from '@/api/dashboardApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '../ui/button'
import { editorFieldClass, editorTextareaClass } from '@/lib/editorFieldClasses'
import {
  NOVEL_GENRE_OPTIONS,
  NOVEL_TAG_PRESETS,
  applyNovelDraftSuggestion,
  buildDraftPayload,
  draftFormToPayload,
  emptyNovelDraftForm,
  hasDraftContent,
  novelToDraftForm,
  type NovelDraftForm,
} from '@/lib/novelDraft'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'

const HOOK_MAX = 30
const PROTAGONIST_MAX = 80

interface NovelDetailModalProps {
  novel: Novel | null
  open: boolean
  onClose: () => void
  onSave: (novelId: string, payload: CreateNovelPayload) => Promise<void>
  onDelete: (novelId: string) => Promise<void>
}

const SECTION_CLASS =
  'rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2.5'

const LABEL_CLASS = 'text-xs font-semibold text-muted-foreground'
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

export function NovelDetailModal({
  novel,
  open,
  onClose,
  onSave,
  onDelete,
}: NovelDetailModalProps) {
  const { t } = useTranslation(['editor'])
  const [form, setForm] = useState<NovelDraftForm>(emptyNovelDraftForm())
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [titleError, setTitleError] = useState<string | undefined>()
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiOptimizing, setAiOptimizing] = useState(false)

  useEffect(() => {
    if (open && novel) {
      setForm(novelToDraftForm(novel))
      setTitleError(undefined)
    }
  }, [open, novel])

  const patchForm = useCallback((patch: Partial<NovelDraftForm>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

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
        appToast.success(
          mode === 'generate'
            ? t('editor:createNovel.toastGenerateOk')
            : t('editor:createNovel.toastOptimizeOk'),
        )
      } else {
        appToast.error(
          mode === 'generate'
            ? t('editor:createNovel.toastGenerateFail')
            : t('editor:createNovel.toastOptimizeFail'),
        )
      }
    } catch (err) {
      appToast.error(
        err instanceof Error ? err.message : t('editor:createNovel.toastRequestFail'),
      )
    } finally {
      setBusy(false)
    }
  }

  const toggleTag = (tag: string) => {
    const parts = form.tags
      .split(/[\s,，、]+/)
      .map((item) => item.trim())
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
    if (!novel) return
    if (!form.title.trim()) {
      setTitleError(t('editor:createNovel.titleRequired'))
      return
    }
    setTitleError(undefined)
    setSubmitting(true)
    try {
      await onSave(novel.id, draftFormToPayload(form))
      appToast.success(t('editor:novelDetail.saved'))
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!novel) return
    if (
      !(await confirmAction({
        title: t('editor:novelDetail.deleteTitle'),
        description: t('editor:novelDetail.deleteDesc', { title: novel.title }),
        confirmLabel: t('editor:novelDetail.deleteConfirm'),
        danger: true,
      }))
    ) {
      return
    }
    setDeleting(true)
    try {
      await onDelete(novel.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const aiBusy = aiGenerating || aiOptimizing

  if (!novel) return null

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      size="detail"
      title={t('editor:novelDetail.title')}
      description={t('editor:novelDetail.description')}
      bodyClassName="flex min-h-0 flex-1 flex-col pt-1"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5">
          <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{t('editor:createNovel.aiBanner')}</p>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                disabled={submitting || deleting || aiBusy}
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
                disabled={submitting || deleting || aiBusy || !hasDraftContent(form)}
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
            <p className="text-sm font-semibold text-foreground">
              {t('editor:createNovel.sectionBasic')}
            </p>
            <label className="flex flex-col gap-1.5">
              <FieldLabel hint={t('editor:createNovel.titleHint')}>
                {t('editor:createNovel.titleLabel')}
              </FieldLabel>
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
                <FieldLabel hint={t('editor:createNovel.genreHint')}>
                  {t('editor:createNovel.genreLabel')}
                </FieldLabel>
                <input
                  list="novel-detail-genre-options"
                  value={form.genre}
                  onChange={(e) => patchForm({ genre: e.target.value })}
                  placeholder={t('editor:createNovel.genrePlaceholder')}
                  disabled={aiBusy}
                  className={editorFieldClass}
                />
                <datalist id="novel-detail-genre-options">
                  {NOVEL_GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel hint={t('editor:createNovel.styleHint')}>
                  {t('editor:createNovel.styleLabel')}
                </FieldLabel>
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
              <FieldLabel hint={t('editor:createNovel.tagsHint')}>
                {t('editor:createNovel.tagsLabel')}
              </FieldLabel>
              <input
                value={form.tags}
                onChange={(e) => patchForm({ tags: e.target.value })}
                placeholder={t('editor:createNovel.tagsPlaceholder')}
                disabled={aiBusy}
                className={editorFieldClass}
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {NOVEL_TAG_PRESETS.map((tag) => {
                  const active = form.tags.split(/[\s,，、]+/).includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={aiBusy}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                        active
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border/70 bg-background text-muted-foreground hover:border-border',
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
            <p className="text-sm font-semibold text-foreground">
              {t('editor:createNovel.sectionSelling')}
            </p>
            <label className="flex flex-col gap-1.5">
              <FieldLabel hint={t('editor:createNovel.hookHint')}>
                {t('editor:createNovel.hookLabel')}
              </FieldLabel>
              <input
                value={form.hook}
                maxLength={HOOK_MAX}
                onChange={(e) => patchForm({ hook: e.target.value.slice(0, HOOK_MAX) })}
                placeholder={t('editor:createNovel.hookPlaceholder')}
                disabled={aiBusy}
                className={editorFieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel hint={t('editor:createNovel.protagonistHint')}>
                {t('editor:createNovel.protagonistLabel')}
              </FieldLabel>
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
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>{t('editor:createNovel.sellingPointsLabel')}</FieldLabel>
              <input
                value={form.sellingPoints}
                onChange={(e) => patchForm({ sellingPoints: e.target.value })}
                placeholder={t('editor:createNovel.sellingPointsPlaceholder')}
                disabled={aiBusy}
                className={editorFieldClass}
              />
            </label>
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
            <p className="text-sm font-semibold text-foreground">
              {t('editor:createNovel.sectionSynopsis')}
            </p>
            <label className="flex flex-col gap-1.5">
              <FieldLabel hint={t('editor:createNovel.synopsisHint')}>
                {t('editor:createNovel.synopsisLabel')}
              </FieldLabel>
              <textarea
                value={form.synopsis}
                onChange={(e) => patchForm({ synopsis: e.target.value })}
                placeholder={t('editor:createNovel.synopsisPlaceholder')}
                rows={4}
                disabled={aiBusy}
                className={cn(editorTextareaClass, 'min-h-[6rem] resize-y')}
              />
            </label>
          </section>

          <section className={SECTION_CLASS}>
            <p className="text-sm font-semibold text-foreground">
              {t('editor:createNovel.sectionSerial')}
            </p>
            <label className="flex flex-col gap-1.5 sm:max-w-[220px]">
              <FieldLabel hint={t('editor:createNovel.chapterWordsHint')}>
                {t('editor:createNovel.chapterWordsLabel')}
              </FieldLabel>
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

        <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-popover pt-3 max-md:flex-col-reverse">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive max-md:w-full"
            disabled={submitting || deleting || aiBusy}
            onClick={() => void handleDelete()}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-3.5" />
            )}
            {t('editor:novelDetail.deleteConfirm')}
          </Button>
          <div className="flex gap-2 max-md:w-full max-md:flex-col-reverse">
            <Button
              type="button"
              variant="ghost"
              className="max-md:w-full"
              onClick={onClose}
              disabled={submitting || deleting}
            >
              {t('editor:createNovel.cancel')}
            </Button>
            <Button
              type="submit"
              className="max-md:w-full"
              disabled={submitting || deleting || !form.title.trim() || aiBusy}
            >
              {submitting ? t('editor:novelDetail.saving') : t('editor:novelDetail.save')}
            </Button>
          </div>
        </div>
      </form>
    </AppModalShell>
  )
}
