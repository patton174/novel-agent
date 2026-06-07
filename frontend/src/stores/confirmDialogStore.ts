import { create } from 'zustand'

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean
  resolve: ((confirmed: boolean) => void) | null
}

const defaults: ConfirmDialogOptions = {
  title: '确认操作',
  confirmLabel: '确定',
  cancelLabel: '取消',
  danger: false,
}

export const useConfirmDialogStore = create<ConfirmDialogState>(() => ({
  open: false,
  resolve: null,
  ...defaults,
}))

export function confirmAction(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmDialogStore.setState({
      open: true,
      resolve,
      ...defaults,
      ...options,
    })
  })
}

export function closeConfirmDialog(confirmed: boolean) {
  const { resolve } = useConfirmDialogStore.getState()
  resolve?.(confirmed)
  useConfirmDialogStore.setState({
    open: false,
    resolve: null,
    ...defaults,
  })
}
