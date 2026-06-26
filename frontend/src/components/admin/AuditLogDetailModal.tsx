import type { AuditLogItem } from '@/api/billingAdminApi'
import { PIXEL_CODE_BLOCK, PIXEL_LABEL, PixelTableActionButton } from '@/components/pixel'
import { AppSheetModal } from '@/components/ui/AppSheetModal'
import { copyToClipboard } from '@/utils/copyToClipboard'
import { appToast } from '@/stores/appToastStore'
import { cn } from '@/lib/utils'

interface AuditLogDetailModalProps {
  log: AuditLogItem | null
  onClose: () => void
}

export function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  const beforeFormatted = log?.beforeJson ? formatJson(log.beforeJson) : null
  const afterFormatted = log?.afterJson ? formatJson(log.afterJson) : null

  const handleCopy = (label: string, text: string) => {
    void copyToClipboard(text, `${label}已复制`).catch(() => {
      appToast.error('复制失败')
    })
  }

  return (
    <AppSheetModal
      open={log != null}
      onOpenChange={(open) => !open && onClose()}
      modalSize="reader"
      sheetSide="bottom"
      title={log ? <span className="font-mono text-sm font-bold">{log.action}</span> : undefined}
      description={
        log
          ? `${new Date(log.createdAt).toLocaleString('zh-CN')} · 操作者 ${log.actorId} · 目标 ${log.targetType ?? '—'}${log.targetId ? ` #${log.targetId}` : ''}`
          : undefined
      }
      className="sm:max-w-2xl"
      bodyClassName="space-y-4 px-4 pb-2 text-xs"
    >
      {log ? (
        <>
          {beforeFormatted ? (
            <JsonBlock
              label="变更前"
              tone="before"
              text={beforeFormatted}
              onCopy={() => handleCopy('变更前 JSON', beforeFormatted)}
            />
          ) : null}
          {afterFormatted ? (
            <JsonBlock
              label="变更后"
              tone="after"
              text={afterFormatted}
              onCopy={() => handleCopy('变更后 JSON', afterFormatted)}
            />
          ) : null}
          {!beforeFormatted && !afterFormatted ? (
            <p className="py-6 text-center font-mono text-sm text-muted-foreground">此记录无 JSON 变更载荷</p>
          ) : null}
        </>
      ) : null}
    </AppSheetModal>
  )
}

function JsonBlock({
  label,
  tone,
  text,
  onCopy,
}: {
  label: string
  tone: 'before' | 'after'
  text: string
  onCopy: () => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p
          className={cn(
            PIXEL_LABEL,
            tone === 'before' ? 'text-destructive' : 'text-success',
          )}
        >
          {label}
        </p>
        <PixelTableActionButton variant="ghost" onClick={onCopy}>
          复制
        </PixelTableActionButton>
      </div>
      <pre className={cn('max-h-[min(42vh,320px)]', PIXEL_CODE_BLOCK)}>
        {text}
      </pre>
    </div>
  )
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}
