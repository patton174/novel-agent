import styled from 'styled-components'
import { EditorIcons } from '../editor/icons'
import { editorTheme } from '../../styles/editorTheme'
import { motionInteractiveCss } from '../motion/motionStyles'
import { copyToClipboard } from '../../utils/copyToClipboard'

export interface UserChatBubbleProps {
  content: string
  onEdit?: () => void
  className?: string
}

export function UserChatBubble({ content, onEdit, className }: UserChatBubbleProps) {
  const handleCopy = () => {
    void copyToClipboard(content, '消息已复制')
  }

  const paragraphs = content ? content.split(/\n{2,}/) : ['']

  return (
    <Column className={className}>
      <Bubble>
        {paragraphs.map((para, pIdx) => {
          const paraLines = para.split('\n')
          const isSingleEmpty = paraLines.length === 1 && paraLines[0] === ''
          return (
            <p key={pIdx}>
              {isSingleEmpty
                ? <br />
                : paraLines.map((line, lIdx) => (
                    <span key={lIdx}>
                      {line}
                      {lIdx < paraLines.length - 1 ? <br /> : null}
                    </span>
                  ))}
            </p>
          )
        })}
      </Bubble>
      <Actions>
        <ActionButton
          type="button"
          aria-label="复制"
          title="复制"
          onClick={() => void handleCopy()}
        >
          <EditorIcons.Copy />
        </ActionButton>
        {onEdit ? (
          <ActionButton type="button" aria-label="编辑" title="编辑" onClick={onEdit}>
            <EditorIcons.Edit3 />
          </ActionButton>
        ) : null}
      </Actions>
    </Column>
  )
}

const Column = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  max-width: min(85%, 520px);
`

const Bubble = styled.div`
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  line-height: 1.65;
  color: ${editorTheme.text};
  background: ${editorTheme.accentSoft};
  border: 1px solid rgba(79, 70, 229, 0.22);
  border-radius: 18px;
  white-space: pre-wrap;
  word-break: break-word;

  p {
    margin: 0 0 0.4rem;
  }

  p:last-child {
    margin-bottom: 0;
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding-right: 0.15rem;
`

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${editorTheme.textMuted};
  cursor: pointer;
  ${motionInteractiveCss}

  svg {
    width: 15px;
    height: 15px;
  }

  &:hover {
    color: ${editorTheme.textSecondary};
    background: ${editorTheme.accentMuted};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.45);
  }
`
