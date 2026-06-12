import { EditorButton } from '../ui/EditorButton'
import { Switch } from '../ui/switch'
import {
  EditorModalBody,
  EditorModalHeader,
  EditorModalOverlay,
  EditorModalPanel,
  useEditorModalEscape,
} from '../editor/EditorModalShell'
import { DIRECT_PYTHON } from '../../config/runtime'
import { isLoggedIn } from '../../utils/auth'
import { cn } from '@/lib/utils'

export interface EditorSettingsModalProps {
  open: boolean
  onClose: () => void
  hostModeEnabled: boolean
  onHostModeChange: (enabled: boolean) => void
  onLogout: () => void
}

export function EditorSettingsModal({
  open,
  onClose,
  hostModeEnabled,
  onHostModeChange,
  onLogout,
}: EditorSettingsModalProps) {
  const showAccount = !DIRECT_PYTHON && isLoggedIn()

  useEditorModalEscape(open, onClose)

  if (!open) return null

  return (
    <EditorModalOverlay onClick={onClose} role="presentation">
      <EditorModalPanel
        size="settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <EditorModalHeader className="items-center">
          <h2 id="editor-settings-title" className="m-0 text-lg font-bold text-foreground">
            设置
          </h2>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </EditorModalHeader>

        <EditorModalBody className="flex flex-col gap-5 px-6 pb-6 pt-2 max-md:px-4 max-md:pb-5">
          <section className="flex flex-col gap-3.5">
            <h3 className="m-0 border-b border-primary/20 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
              创作偏好
            </h3>
            <div
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3',
                'max-md:flex-col max-md:items-stretch max-md:gap-2.5',
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">AI 盯防模式</span>
                <span className="text-xs leading-snug text-muted-foreground">
                  开启后任务可在后台长时运行；关闭则为单次对话
                </span>
              </div>
              <Switch
                checked={hostModeEnabled}
                onCheckedChange={onHostModeChange}
                aria-label="AI 盯防模式"
                className="shrink-0 self-end max-md:self-start"
              />
            </div>
          </section>

          {showAccount ? (
            <section className="flex flex-col gap-3.5">
              <h3 className="m-0 border-b border-primary/20 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                账户
              </h3>
              <EditorButton type="button" variant="ghost" fullWidth onClick={onLogout}>
                退出登录
              </EditorButton>
            </section>
          ) : null}
        </EditorModalBody>
      </EditorModalPanel>
    </EditorModalOverlay>
  )
}
