import { useEffect, useId, useRef, useState } from 'react'
import styled from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { EditorButton } from './EditorButton'
import {
  EditorModalOverlay,
  EditorModalPanel,
  EditorModalPanelInset,
  useEditorModalEscape,
} from '../editor/EditorModalShell'

export type AppDialogVariant = 'confirm' | 'prompt'

export interface AppDialogProps {
  open: boolean
  variant: AppDialogVariant
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  defaultValue?: string
  placeholder?: string
  onClose: () => void
  onConfirm: (value?: string) => void
}

export function AppDialog({
  open,
  variant,
  title,
  description,
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  defaultValue = '',
  placeholder,
  onClose,
  onConfirm,
}: AppDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)

  useEditorModalEscape(open, onClose)

  useEffect(() => {
    if (!open) return
    setValue(defaultValue)
  }, [open, defaultValue])

  useEffect(() => {
    if (open && variant === 'prompt') {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open, variant])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (variant === 'prompt') {
      const trimmed = value.trim()
      if (!trimmed) return
      onConfirm(trimmed)
      return
    }
    onConfirm()
  }

  return (
    <EditorModalOverlay onClick={onClose} role="presentation">
      <EditorModalPanel
        $size="confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <EditorModalPanelInset>
          <Title id={titleId}>{title}</Title>
          {description ? <Description>{description}</Description> : null}
          <Form onSubmit={handleSubmit}>
            {variant === 'prompt' ? (
              <TextInput
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                aria-label={title}
              />
            ) : null}
            <Actions>
              <EditorButton type="button" variant="ghost" onClick={onClose}>
                {cancelLabel}
              </EditorButton>
              <EditorButton
                type="submit"
                variant={danger ? 'danger' : 'primary'}
                disabled={variant === 'prompt' && !value.trim()}
              >
                {confirmLabel}
              </EditorButton>
            </Actions>
          </Form>
        </EditorModalPanelInset>
      </EditorModalPanel>
    </EditorModalOverlay>
  )
}

const Title = styled.h2`
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: ${editorTheme.text};
`

const Description = styled.p`
  margin: 0 0 1rem;
  font-size: 0.88rem;
  line-height: 1.55;
  color: ${editorTheme.textSecondary};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const TextInput = styled.input`
  border: none;
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
  background: ${editorTheme.bgElevated};
  box-shadow: ${editorTheme.shadowIn};
  font-size: 0.95rem;
  color: ${editorTheme.text};
  font-family: inherit;
  outline: none;

  &:focus {
    box-shadow: ${editorTheme.shadowIn}, 0 0 0 2px ${editorTheme.accent};
  }
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;

  @media (max-width: 767px) {
    flex-direction: column-reverse;

    button {
      width: 100%;
      justify-content: center;
    }
  }
`
