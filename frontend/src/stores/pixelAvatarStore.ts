import { create } from 'zustand'
import { fetchPixelAvatarFromServer, savePixelAvatarToServer } from '@/api/pixelAvatarApi'
import { getPresetById, resolvePixelAvatarColors } from '@/lib/pixelAvatar/presets'
import { readAvatarSelection, writeAvatarSelection } from '@/lib/pixelAvatar/storage'
import {
  DEFAULT_PIXEL_AVATAR,
  type PixelAvatarColors,
  type PixelAvatarSelection,
  type PixelAvatarStyle,
} from '@/lib/pixelAvatar/types'

let boundUserId: string | null | undefined
let remoteSaveTimer: ReturnType<typeof setTimeout> | null = null
let remoteSaveSeq = 0

interface PixelAvatarState extends PixelAvatarSelection {
  userId: string | null
  syncing: boolean
  hydrateForUser: (userId: string | null) => Promise<void>
  setStyle: (style: PixelAvatarStyle) => void
  setPresetId: (presetId: string) => void
  setCustomColors: (colors: Partial<PixelAvatarColors>) => void
  resolvedColors: () => PixelAvatarColors
}

function applySelection(
  get: () => PixelAvatarState,
  set: (patch: Partial<PixelAvatarState>) => void,
  selection: PixelAvatarSelection,
) {
  writeAvatarSelection(get().userId, selection)
  set(selection)
  queueRemoteSave(get().userId, selection)
}

function persist(
  get: () => PixelAvatarState,
  set: (patch: Partial<PixelAvatarState>) => void,
  patch: Partial<PixelAvatarSelection>,
) {
  const next: PixelAvatarSelection = {
    style: patch.style ?? get().style,
    presetId: patch.presetId ?? get().presetId,
    customColors: patch.customColors ?? get().customColors,
  }
  applySelection(get, set, next)
  return next
}

function queueRemoteSave(userId: string | null, selection: PixelAvatarSelection) {
  if (!userId) return
  if (remoteSaveTimer) clearTimeout(remoteSaveTimer)
  const seq = ++remoteSaveSeq
  remoteSaveTimer = setTimeout(() => {
    void savePixelAvatarToServer(selection).catch(() => {
      if (seq === remoteSaveSeq) {
        /* 保留本地缓存，静默失败 */
      }
    })
  }, 450)
}

export const usePixelAvatarStore = create<PixelAvatarState>((set, get) => ({
  ...DEFAULT_PIXEL_AVATAR,
  userId: null,
  syncing: false,
  hydrateForUser: async (userId) => {
    const normalized = userId?.trim() || null
    if (boundUserId === normalized && get().userId === normalized && !get().syncing) {
      return
    }
    boundUserId = normalized
    set({ syncing: true, userId: normalized })

    let selection = readAvatarSelection(normalized)
    if (normalized) {
      try {
        const remote = await fetchPixelAvatarFromServer()
        if (remote) {
          selection = remote
          writeAvatarSelection(normalized, remote)
        }
      } catch {
        /* 离线或后端未部署：使用本地缓存 */
      }
    }

    set({ ...selection, userId: normalized, syncing: false })
  },
  setStyle: (style) => {
    persist(get, set, { style })
  },
  setPresetId: (presetId) => {
    const preset = getPresetById(presetId)
    persist(get, set, {
      presetId,
      ...(preset ? { customColors: { ...preset.colors } } : {}),
    })
  },
  setCustomColors: (colors) => {
    persist(get, set, {
      presetId: 'custom',
      customColors: { ...get().customColors, ...colors },
    })
  },
  resolvedColors: () => resolvePixelAvatarColors(get().presetId, get().customColors),
}))

/** 登录 / 刷新 profile 后绑定用户并从服务端拉取头像 */
export function syncPixelAvatarForUser(userId: string | null | undefined) {
  return usePixelAvatarStore.getState().hydrateForUser(userId?.trim() || null)
}
