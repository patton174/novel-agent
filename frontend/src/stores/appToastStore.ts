import { create } from 'zustand'

export type AppToastKind = 'success' | 'error' | 'info'

export interface AppToastItem {
  id: string
  kind: AppToastKind
  message: string
}

const AUTO_DISMISS_MS = 3200

interface AppToastState {
  items: AppToastItem[]
  push: (message: string, kind?: AppToastKind) => void
  dismiss: (id: string) => void
}

export const useAppToastStore = create<AppToastState>((set, get) => ({
  items: [],
  push(message, kind = 'info') {
    const text = message.trim()
    if (!text) return
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set((state) => ({
      items: [...state.items, { id, kind, message: text }],
    }))
    window.setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS)
  },
  dismiss(id) {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },
}))

export const appToast = {
  success(message: string) {
    useAppToastStore.getState().push(message, 'success')
  },
  error(message: string) {
    useAppToastStore.getState().push(message, 'error')
  },
  info(message: string) {
    useAppToastStore.getState().push(message, 'info')
  },
}
