import { useEffect, useId, useRef, useState } from 'react'
import styled from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { editorModalSurface } from '../../styles/editorModal'
import { EditorButton } from './EditorButton'

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

  useEffect(() => {
    if (!open) return
    setValue(defaultValue)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, defaultValue, onClose])

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
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
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
  animation: fadeIn 0.18s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const Dialog = styled.div`
  width: min(420px, 100%);
  padding: 1.5rem 1.75rem;
  border-radius: 18px;
  background: ${editorModalSurface.dialogBg};
  box-shadow: ${editorModalSurface.dialogShadow};
  animation: slideUp 0.22s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`

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
`
