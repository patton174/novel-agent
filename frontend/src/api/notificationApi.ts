import i18n from '@/i18n'
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse, readApiErrorMessage } from '../utils/resultApi'

export type NotificationCategory = 'system' | 'billing' | 'agent' | 'marketing'

export interface UserNotification {
  id: string
  category: NotificationCategory
  title: string
  body?: string | null
  /** Present when the server marks the item read (boolean `read` is normalized here). */
  readAt?: string | null
  createdAt: string
  payload?: Record<string, unknown> | null
}

export interface NotificationInboxPage {
  items: UserNotification[]
  nextCursor?: string | null
  hasMore?: boolean
}

export interface UnreadCount {
  count: number
}

export interface BroadcastRequest {
  title: string
  body: string
  category?: NotificationCategory
}

type RawNotificationItem = {
  id: number | string
  category: NotificationCategory
  title: string
  body?: string | null
  read?: boolean
  readAt?: string | null
  createdAt: string
  payload?: Record<string, unknown> | null
}

type RawInboxPage = {
  list?: RawNotificationItem[]
  items?: RawNotificationItem[]
  hasMore?: boolean
  nextCursor?: number | string | null
}

const EMPTY_INBOX: NotificationInboxPage = { items: [], hasMore: false }

function normalizeNotificationItem(raw: RawNotificationItem): UserNotification {
  const readAt =
    raw.readAt ??
    (raw.read === true ? 'read' : null)
  return {
    id: String(raw.id),
    category: raw.category,
    title: raw.title,
    body: raw.body ?? null,
    readAt,
    createdAt: raw.createdAt,
    payload: raw.payload ?? null,
  }
}

export function normalizeInboxPage(data: RawInboxPage | null | undefined): NotificationInboxPage {
  if (!data) return EMPTY_INBOX
  const rows = Array.isArray(data.list)
    ? data.list
    : Array.isArray(data.items)
      ? data.items
      : []
  return {
    items: rows.map(normalizeNotificationItem),
    nextCursor: data.nextCursor != null ? String(data.nextCursor) : null,
    hasMore: Boolean(data.hasMore),
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(i18n.t('admin:errors.noAdminPermission'))
    }
    throw new Error(await readApiErrorMessage(res))
  }
  return parseResultResponse<T>(res)
}

export async function fetchInbox(params?: {
  cursor?: string
  limit?: number
}): Promise<NotificationInboxPage> {
  try {
    const search = new URLSearchParams()
    if (params?.cursor) search.set('cursor', params.cursor)
    if (params?.limit != null) search.set('limit', String(params.limit))
    const qs = search.toString()
    const res = await secureFetch(
      `/api/notification/auth/inbox${qs ? `?${qs}` : ''}`,
    )
    if (!res.ok) return EMPTY_INBOX
    const data = await parseResultResponse<RawInboxPage>(res)
    return normalizeInboxPage(data)
  } catch {
    return EMPTY_INBOX
  }
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await secureFetch('/api/notification/auth/unread-count')
    if (!res.ok) return 0
    const data = await parseResultResponse<Partial<UnreadCount>>(res)
    return typeof data?.count === 'number' ? Math.max(0, data.count) : 0
  } catch {
    return 0
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await secureFetch(`/api/notification/auth/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await secureFetch('/api/notification/auth/read-all', {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }
}

export async function broadcastNotification(payload: BroadcastRequest): Promise<void> {
  const res = await secureFetch('/api/notification/crm/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await parseResponse<unknown>(res)
}
