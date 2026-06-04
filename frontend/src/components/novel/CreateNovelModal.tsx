import React, { useState } from 'react'
import styled from 'styled-components'
import type { CreateNovelPayload } from '../../types/novel'
import { EditorButton } from '../ui/EditorButton'
import { editorModalSurface } from '../../styles/editorModal'
import { palette, shadow, transition } from '../../styles/theme'

interface CreateNovelModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: CreateNovelPayload) => Promise<void>
}

const fieldCss = `
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  background: ${palette.bgPage};
  box-shadow: ${shadow.inInput};
  font-size: 0.95rem;
  color: ${palette.text};
  font-family: inherit;
  outline: none;
  transition: box-shadow ${transition.fast}, border-color ${transition.fast};

  &::placeholder {
    color: ${palette.textFaint};
  }

  &:focus {
    border-color: rgba(233, 181, 11, 0.45);
    box-shadow: ${shadow.inInput}, 0 0 0 3px rgba(233, 181, 11, 0.12);
  }
`

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

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
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
    <Overlay onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <h2>创建小说</h2>
        <Form onSubmit={(e) => void handleSubmit(e)}>
          <Field>
            <span className="label">小说名称 *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：星辰之途"
            />
          </Field>
          <Field>
            <span className="label">简介 / 设定</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="世界观、主角、核心冲突… 将作为 AI 上下文"
              rows={4}
            />
          </Field>
          <PairRow>
            <Field>
              <span className="label">类型</span>
              <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="玄幻" />
            </Field>
            <Field>
              <span className="label">风格</span>
              <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="爽文" />
            </Field>
          </PairRow>
          <Field>
            <span className="label">章节字数</span>
            <input
              type="number"
              min={500}
              value={targetWords}
              onChange={(e) => setTargetWords(e.target.value)}
            />
          </Field>
          <Actions>
            <EditorButton type="button" variant="ghost" onClick={onClose}>
              取消
            </EditorButton>
            <EditorButton type="submit" variant="primary" disabled={submitting || !title.trim()}>
              {submitting ? '创建中…' : '创建'}
            </EditorButton>
          </Actions>
        </Form>
      </Dialog>
    </Overlay>
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: ${editorModalSurface.overlay};
  backdrop-filter: ${editorModalSurface.overlayBlur};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
`

const Dialog = styled.div`
  background: ${editorModalSurface.dialogBg};
  border-radius: 16px;
  padding: 1.75rem;
  width: min(480px, 100%);
  max-height: min(90vh, 640px);
  overflow-y: auto;
  box-shadow: ${editorModalSurface.dialogShadow};

  h2 {
    margin: 0 0 1.25rem;
    font-size: 1.2rem;
    color: ${palette.text};
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;

  .label {
    font-size: 0.82rem;
    color: ${palette.textSecondary};
    font-weight: 600;
  }

  input,
  textarea {
    ${fieldCss}
  }

  textarea {
    resize: vertical;
    min-height: 5rem;
  }
`

const PairRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  min-width: 0;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.35rem;
`
