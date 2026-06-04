import { AppDialog } from '../ui/AppDialog'
import type { SessionDialogState } from '../../types/editor'

export interface EditorSessionDialogsProps {
  dialog: SessionDialogState
  onClose: () => void
  onConfirmRename: (title: string) => void
  onConfirmDelete: () => void
  onConfirmBatchDelete: () => void
  onConfirmDeleteNovel: () => void
}

export function EditorSessionDialogs({
  dialog,
  onClose,
  onConfirmRename,
  onConfirmDelete,
  onConfirmBatchDelete,
  onConfirmDeleteNovel,
}: EditorSessionDialogsProps) {
  return (
    <>
      <AppDialog
        open={dialog?.kind === 'rename'}
        variant="prompt"
        title="重命名对话"
        defaultValue={dialog?.kind === 'rename' ? dialog.title : ''}
        placeholder="输入对话名称"
        confirmLabel="保存"
        onClose={onClose}
        onConfirm={(value) => {
          if (value) onConfirmRename(value)
        }}
      />
      <AppDialog
        open={dialog?.kind === 'delete'}
        variant="confirm"
        title="删除对话"
        description="本地消息将一并清除，此操作不可撤销。"
        confirmLabel="删除"
        danger
        onClose={onClose}
        onConfirm={onConfirmDelete}
      />
      <AppDialog
        open={dialog?.kind === 'delete-batch'}
        variant="confirm"
        title="批量删除对话"
        description={
          dialog?.kind === 'delete-batch'
            ? `将删除 ${dialog.sessionIds.length} 条对话及其本地消息，不可撤销。`
            : ''
        }
        confirmLabel="删除"
        danger
        onClose={onClose}
        onConfirm={onConfirmBatchDelete}
      />
      <AppDialog
        open={dialog?.kind === 'delete-novel'}
        variant="confirm"
        title="删除小说"
        description={
          dialog?.kind === 'delete-novel'
            ? `确定删除「${dialog.title}」？关联对话与本地消息将清除，章节数据将从服务端删除，不可撤销。`
            : ''
        }
        confirmLabel="删除"
        danger
        onClose={onClose}
        onConfirm={onConfirmDeleteNovel}
      />
    </>
  )
}
