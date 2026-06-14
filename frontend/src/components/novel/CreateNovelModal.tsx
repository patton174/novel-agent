import React, { useState } from 'react'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import type { CreateNovelPayload } from '../../types/novel'
import { suggestNovelDescriptionPrompt } from '@/api/dashboardApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '../ui/button'
import { editorFieldClass, editorTextareaClass } from '@/lib/editorFieldClasses'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'

interface CreateNovelModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: CreateNovelPayload) => Promise<void>
}

export const CreateNovelModal: React.FC<CreateNovelModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [style, setStyle] = useState('')
  const [targetWords, setTargetWords] = useState('3000')
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | undefined>()
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiOptimizing, setAiOptimizing] = useState(false)

  const handleAiGenerate = async () => {
    if (aiGenerating || aiOptimizing) return
    setAiGenerating(true)
    try {
      const suggested = await suggestNovelDescriptionPrompt({
        title: title.trim(),
        genre: genre.trim(),
        style: style.trim(),
      })
      if (suggested) {
        setDescription(suggested)
      } else {
        appToast.error('AI 生成失败，请稍后重试')
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : 'AI 生成失败')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAiOptimize = async () => {
    if (aiGenerating || aiOptimizing) return
    const draft = description.trim()
    if (!draft) {
      appToast.error('请先填写简介草稿，或使用 AI 生成')
      return
    }
    setAiOptimizing(true)
    try {
      const suggested = await suggestNovelDescriptionPrompt({
        title: title.trim(),
        genre: genre.trim(),
        style: style.trim(),
        draft,
      })
      if (suggested) {
        setDescription(suggested)
      } else {
        appToast.error('AI 优化失败，请稍后重试')
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : 'AI 优化失败')
    } finally {
      setAiOptimizing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError('请输入小说名称')
      return
    }
    setTitleError(undefined)
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        genre: genre.trim() || undefined,
        style: style.trim() || undefined,
        targetChapterWords: Number.parseInt(targetWords, 10) || 3000,
      })
      setTitle('')
      setDescription('')
      setGenre('')
      setStyle('')
      setTargetWords('3000')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const aiBusy = aiGenerating || aiOptimizing

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="form"
      title="创建小说"
      bodyClassName="pt-1"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">小说名称 *</span>
          <input
            value={title}
            aria-invalid={titleError ? true : undefined}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError(undefined)
            }}
            placeholder="例：星辰之途"
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

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">简介 / 设定</span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={submitting || aiBusy}
                onClick={() => void handleAiGenerate()}
              >
                {aiGenerating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                AI 生成
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={submitting || aiBusy || !description.trim()}
                onClick={() => void handleAiOptimize()}
              >
                {aiOptimizing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Wand2 className="size-3" />
                )}
                AI 优化
              </Button>
            </div>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="世界观、主角、核心冲突… 将作为 AI 上下文"
            rows={4}
            disabled={aiBusy}
            className={cn(editorTextareaClass, aiBusy && 'opacity-70')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">类型</span>
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="玄幻"
              className={editorFieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">风格</span>
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="爽文"
              className={editorFieldClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">章节字数</span>
          <input
            type="number"
            min={500}
            value={targetWords}
            onChange={(e) => setTargetWords(e.target.value)}
            className={editorFieldClass}
          />
        </label>

        <div className="flex justify-end gap-2 pt-1 max-md:flex-col-reverse">
          <Button type="button" variant="ghost" className="max-md:w-full" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" className="max-md:w-full" disabled={submitting || !title.trim() || aiBusy}>
            {submitting ? '创建中…' : '创建'}
          </Button>
        </div>
      </form>
    </AppModalShell>
  )
}
