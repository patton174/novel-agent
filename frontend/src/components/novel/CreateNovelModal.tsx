import React, { useState } from 'react'
import type { CreateNovelPayload } from '../../types/novel'
import { EditorButton } from '../ui/EditorButton'
import {
  EditorModalBody,
  EditorModalHeader,
  EditorModalOverlay,
  EditorModalPanel,
  useEditorModalEscape,
} from '../editor/EditorModalShell'
import { Button } from '../ui/button'
import { editorFieldClass, editorTextareaClass } from '@/lib/editorFieldClasses'
import { cn } from '@/lib/utils'

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

  useEditorModalEscape(open, onClose)

  if (!open) return null

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

  return (
    <EditorModalOverlay onClick={onClose} role="presentation">
      <EditorModalPanel
        size="form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-novel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <EditorModalHeader className="items-center">
          <h2 id="create-novel-title" className="m-0 text-lg font-bold text-foreground">
            创建小说
          </h2>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </EditorModalHeader>

        <EditorModalBody className="px-6 pb-6 pt-2 max-md:px-4 max-md:pb-5">
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

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">简介 / 设定</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="世界观、主角、核心冲突… 将作为 AI 上下文"
                rows={4}
                className={editorTextareaClass}
              />
            </label>

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
              <Button
                type="submit"
                className="max-md:w-full"
                disabled={submitting || !title.trim()}
              >
                {submitting ? '创建中…' : '创建'}
              </Button>
            </div>
          </form>
        </EditorModalBody>
      </EditorModalPanel>
    </EditorModalOverlay>
  )
}
