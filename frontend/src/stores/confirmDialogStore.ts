import { create } from 'zustand'

export type AppDialogKind = 'confirm' | 'alert' | 'prompt'

export interface AppDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  defaultValue?: string
  placeholder?: string
}

type ConfirmOptions = Omit<AppDialogOptions, 'defaultValue' | 'placeholder'>

interface AppDialogState extends AppDialogOptions {
  open: boolean
  kind: AppDialogKind
  resolve: ((value: boolean | string | null) => void) | null
}

const defaults: AppDialogOptions = {
  title: '提示',
  confirmLabel: '确定',
  cancelLabel: '取消',
  danger: false,
  defaultValue: '',
  placeholder: '',
}

export const useAppDialogStore = create<AppDialogState>(() => ({
  open: false,
  kind: 'confirm',
  resolve: null,
  ...defaults,
}))

function openDialog<T extends boolean | string | null>(
  kind: AppDialogKind,
  options: AppDialogOptions,
): Promise<T> {
  return new Promise((resolve) => {
    useAppDialogStore.setState({
      open: true,
      kind,
      resolve: resolve as (value: boolean | string | null) => void,
      ...defaults,
      ...options,
    })
  })
}

/** 确认操作，返回是否点击确定 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return openDialog<boolean>('confirm', options)
}

/** 仅提示，单按钮关闭 */
export function alertDialog(
  options: Pick<AppDialogOptions, 'title' | 'description' | 'confirmLabel'>,
): Promise<void> {
  return openDialog<boolean>('alert', {
    confirmLabel: '知道了',
    ...options,
  }).then(() => undefined)
}

/** 输入框，取消或关闭返回 null */
export function promptDialog(
  options: AppDialogOptions & { defaultValue?: string },
): Promise<string | null> {
  return openDialog<string | null>('prompt', options)
}

export function closeAppDialog(result: boolean | string | null) {
  const { resolve } = useAppDialogStore.getState()
  resolve?.(result)
  useAppDialogStore.setState({
    open: false,
    resolve: null,
    kind: 'confirm',
    ...defaults,
  })
}
