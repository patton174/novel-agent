/** 全局通用弹窗 API：confirm / alert / prompt */
export {
  alertDialog,
  closeAppDialog,
  confirmAction,
  promptDialog,
  useAppDialogStore,
} from './confirmDialogStore'

export type { AppDialogKind, AppDialogOptions, ConfirmDialogOptions } from './confirmDialogStore'
