import { secureFetch } from '@/security/secureFetch'
import { normalizePixelAvatarSelection, selectionToApiPayload } from '@/lib/pixelAvatar/serialize'
import type { PixelAvatarSelection } from '@/lib/pixelAvatar/types'
import { parseResultResponse, readApiErrorMessage } from '@/utils/resultApi'

interface PixelAvatarWire {
  style?: string
  presetId?: string
  customColors?: {
    primary?: string
    accent?: string
    highlight?: string
  }
}

function wireToSelection(raw: PixelAvatarWire | null | undefined): PixelAvatarSelection | null {
  if (!raw) return null
  const cc = raw.customColors
  return normalizePixelAvatarSelection({
    style: raw.style as PixelAvatarSelection['style'],
    presetId: raw.presetId,
    customColors: cc
      ? { primary: cc.primary ?? '', accent: cc.accent ?? '', highlight: cc.highlight ?? '' }
      : undefined,
  })
}

export async function fetchPixelAvatarFromServer(): Promise<PixelAvatarSelection | null> {
  const res = await secureFetch('/api/auth/auth/pixel-avatar')
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }
  const raw = await parseResultResponse<PixelAvatarWire | null>(res)
  return wireToSelection(raw)
}

export async function savePixelAvatarToServer(selection: PixelAvatarSelection): Promise<void> {
  const res = await secureFetch('/api/auth/auth/pixel-avatar', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selectionToApiPayload(selection)),
  })
  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }
  await parseResultResponse(res)
}

export function pixelAvatarFromUserInfo(raw: PixelAvatarWire | null | undefined): PixelAvatarSelection | null {
  return wireToSelection(raw)
}
