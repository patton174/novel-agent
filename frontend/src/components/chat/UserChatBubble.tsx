import { useTranslation } from 'react-i18next'
import { EditorIcons } from '../editor/icons'
import { copyToClipboard } from '../../utils/copyToClipboard'
import { cn } from '@/lib/utils'
import {
  USER_CHAT_ACTION_BTN,
  USER_CHAT_ACTIONS,
  USER_CHAT_BUBBLE,
  USER_CHAT_COLUMN,
} from '@/lib/agentChatClasses'

export interface UserChatBubbleProps {
  content: string
  onEdit?: () => void
  className?: string
}

export function UserChatBubble({ content, onEdit, className }: UserChatBubbleProps) {
  const { t } = useTranslation(['common', 'editor'])

  const handleCopy = () => {
    void copyToClipboard(content, t('editor:chat.messageCopied'))
  }

  const singleLine = !content.includes('\n')

  return (
    <div className={[USER_CHAT_COLUMN, className].filter(Boolean).join(' ')}>
      <span className={cn(USER_CHAT_BUBBLE, singleLine && 'whitespace-nowrap')}>
        {content || '\u00a0'}
      </span>
      <div className={USER_CHAT_ACTIONS}>
        <button
          type="button"
          className={USER_CHAT_ACTION_BTN}
          aria-label={t('common:copy')}
          title={t('common:copy')}
          onClick={() => void handleCopy()}
        >
          <EditorIcons.Copy />
        </button>
        {onEdit ? (
          <button
            type="button"
            className={USER_CHAT_ACTION_BTN}
            aria-label={t('common:edit')}
            title={t('common:edit')}
            onClick={onEdit}
          >
            <EditorIcons.Edit3 />
          </button>
        ) : null}
      </div>
    </div>
  )
}
