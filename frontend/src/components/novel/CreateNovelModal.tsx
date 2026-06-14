import React, { useCallback, useState } from 'react'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import type { CreateNovelPayload } from '../../types/novel'
import { suggestNovelDescriptionPrompt } from '@/api/dashboardApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '../ui/button'
import { editorFieldClass, editorTextareaClass } from '@/lib/editorFieldClasses'
import {
  NOVEL_GENRE_OPTIONS,
  NOVEL_TAG_PRESETS,
  applyNovelDraftSuggestion,
  assembleNovelDescription,
  buildDraftPayload,
  emptyNovelDraftForm,
  hasDraftContent,
  type NovelDraftForm,
} from '@/lib/novelDraft'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'

const HOOK_MAX = 30
const PROTAGONIST_MAX = 80

interface CreateNovelModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: CreateNovelPayload) => Promise<void>
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

export const CreateNovelModal: React.FC<CreateNovelModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
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
      appToast.error('请至少填写书名或风格标签')
      return
    }
    if (mode === 'optimize' && !hasDraftContent(form)) {
      appToast.error('请先填写部分字段，或使用 AI 一键生成')
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
        appToast.success(mode === 'generate' ? '已生成完整建书信息' : '已优化全部字段')
      } else {
        appToast.error(mode === 'generate' ? 'AI 生成失败' : 'AI 优化失败')
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : 'AI 请求失败')
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
      setTitleError('请输入小说名称')
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
      title="创建小说"
      description="填写番茄式建书信息，AI 可一次性生成或优化全部字段"
      bodyClassName="flex min-h-0 flex-1 flex-col pt-1"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5">
        <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            结构化输出，自动填充书名、分类、标签、简介等全部字段
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
              AI 一键生成
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
              AI 优化全部
            </Button>
          </div>
        </div>

        <section className={SECTION_CLASS}>
          <p className="text-sm font-semibold text-foreground">基础信息</p>
          <label className="flex flex-col gap-1.5">
            <FieldLabel hint="番茄书名：吸睛、点明金手指或题材">小说名称 *</FieldLabel>
            <input
              value={form.title}
              aria-invalid={titleError ? true : undefined}
              onChange={(e) => {
                patchForm({ title: e.target.value })
                if (titleError) setTitleError(undefined)
              }}
              placeholder="例：我有神级天赋！！！无限资源"
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
              <FieldLabel hint="番茄主分类">类型</FieldLabel>
              <input
                list="novel-genre-options"
                value={form.genre}
                onChange={(e) => patchForm({ genre: e.target.value })}
                placeholder="玄幻"
                disabled={aiBusy}
                className={editorFieldClass}
              />
              <datalist id="novel-genre-options">
                {NOVEL_GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel hint="叙事视角与节奏">叙事风格</FieldLabel>
              <input
                value={form.style}
                onChange={(e) => patchForm({ style: e.target.value })}
                placeholder="第三人称 · 快节奏 · 强钩子"
                disabled={aiBusy}
                className={editorFieldClass}
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel hint="空格分隔，如：爽文 单女主 全民求生">风格标签</FieldLabel>
            <input
              value={form.tags}
              onChange={(e) => patchForm({ tags: e.target.value })}
              placeholder="爽文 单女主 系统"
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
          <p className="text-sm font-semibold text-foreground">卖点与设定</p>
          <label className="flex flex-col gap-1.5">
            <FieldLabel hint="≤30 字，适合开屏展示">一句话卖点</FieldLabel>
            <input
              value={form.hook}
              maxLength={HOOK_MAX}
              onChange={(e) => patchForm({ hook: e.target.value.slice(0, HOOK_MAX) })}
              placeholder="开局觉醒无限资源，别人求生我建城"
              disabled={aiBusy}
              className={editorFieldClass}
            />
            <span className={HINT_CLASS}>{form.hook.length}/{HOOK_MAX} 字</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel hint={`≤${PROTAGONIST_MAX} 字`}>主角设定</FieldLabel>
              <textarea
                value={form.protagonist}
                maxLength={PROTAGONIST_MAX}
                onChange={(e) =>
                  patchForm({ protagonist: e.target.value.slice(0, PROTAGONIST_MAX) })
                }
                placeholder="林逸，被拉入生存游戏，天赋【无限资源】"
                rows={2}
                disabled={aiBusy}
                className={cn(editorTextareaClass, 'min-h-[3.5rem] resize-none')}
              />
              <span className={HINT_CLASS}>{form.protagonist.length}/{PROTAGONIST_MAX} 字</span>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <FieldLabel>卖点关键词</FieldLabel>
              <input
                value={form.sellingPoints}
                onChange={(e) => patchForm({ sellingPoints: e.target.value })}
                placeholder="爽文,系统,生存,建城,单女主"
                disabled={aiBusy}
                className={editorFieldClass}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>世界观要点</FieldLabel>
            <textarea
              value={form.worldview}
              onChange={(e) => patchForm({ worldview: e.target.value })}
              placeholder="神陨大陆，全球被拉入生存游戏，资源决定生死…"
              rows={3}
              disabled={aiBusy}
              className={cn(editorTextareaClass, 'min-h-[4rem] resize-y')}
            />
          </label>
        </section>

        <section className={SECTION_CLASS}>
          <p className="text-sm font-semibold text-foreground">书籍简介</p>
          <label className="flex flex-col gap-1.5">
            <FieldLabel hint="番茄上架简介：2-4 段，120-300 字，含冲突与连载钩子">
              简介正文
            </FieldLabel>
            <textarea
              value={form.synopsis}
              onChange={(e) => patchForm({ synopsis: e.target.value })}
              placeholder="当百亿人被强制拉入生存游戏…"
              rows={4}
              disabled={aiBusy}
              className={cn(editorTextareaClass, 'min-h-[6rem] resize-y')}
            />
            <span className={HINT_CLASS}>
              当前 {form.synopsis.trim().length} 字 · 保存时将合并卖点/世界观/主角为 Agent 上下文
            </span>
          </label>
        </section>

        <section className={SECTION_CLASS}>
          <p className="text-sm font-semibold text-foreground">连载设定</p>
          <label className="flex flex-col gap-1.5 sm:max-w-[220px]">
            <FieldLabel hint="番茄常见 2000–3500">每章目标字数</FieldLabel>
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
            取消
          </Button>
          <Button
            type="submit"
            className="max-md:w-full"
            disabled={submitting || !form.title.trim() || aiBusy}
          >
            {submitting ? '创建中…' : '创建小说'}
          </Button>
        </div>
      </form>
    </AppModalShell>
  )
}
