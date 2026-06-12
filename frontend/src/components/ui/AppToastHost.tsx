import { useAppToastStore, type AppToastKind } from '../../stores/appToastStore'
import {
  APP_TOAST_DISMISS,
  APP_TOAST_HOST,
  APP_TOAST_MESSAGE,
  appToastCardClass,
  appToastKindTagClass,
} from '@/lib/appToastClasses'

const KIND_LABEL: Record<AppToastKind, string> = {
  success: '成功',
  error: '失败',
  info: '提示',
}

export function AppToastHost() {
  const items = useAppToastStore((s) => s.items)
  const dismiss = useAppToastStore((s) => s.dismiss)

  if (items.length === 0) return null

  return (
    <div className={APP_TOAST_HOST} aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div key={item.id} className={appToastCardClass(item.kind)} role="status">
          <span className={appToastKindTagClass(item.kind)}>{KIND_LABEL[item.kind]}</span>
          <div className={APP_TOAST_MESSAGE}>{item.message}</div>
          <button
            type="button"
            className={APP_TOAST_DISMISS}
            aria-label="关闭"
            onClick={() => dismiss(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
