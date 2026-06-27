import i18n from '@/i18n'

export type SessionDateGroup = 'today' | 'yesterday' | 'week' | 'older'

const GROUP_ORDER: SessionDateGroup[] = ['today', 'yesterday', 'week', 'older']

export function sessionGroupLabel(group: SessionDateGroup): string {
  return i18n.t(`common:sessionGroups.${group}`)
}

/** @deprecated use sessionGroupLabel() */
export const SESSION_GROUP_LABELS: Record<SessionDateGroup, string> = {
  get today() {
    return sessionGroupLabel('today')
  },
  get yesterday() {
    return sessionGroupLabel('yesterday')
  },
  get week() {
    return sessionGroupLabel('week')
  },
  get older() {
    return sessionGroupLabel('older')
  },
}

function resolveGroup(date: Date, now: Date): SessionDateGroup {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'week'
  return 'older'
}

export interface GroupedSessions<T> {
  group: SessionDateGroup
  label: string
  items: T[]
}

export function groupSessionsByDate<T extends { updatedAt: Date }>(
  sessions: T[],
  now = new Date(),
): GroupedSessions<T>[] {
  const buckets = new Map<SessionDateGroup, T[]>()
  for (const session of sessions) {
    const group = resolveGroup(session.updatedAt, now)
    const list = buckets.get(group) ?? []
    list.push(session)
    buckets.set(group, list)
  }

  return GROUP_ORDER.filter((group) => (buckets.get(group)?.length ?? 0) > 0).map((group) => ({
    group,
    label: sessionGroupLabel(group),
    items: buckets.get(group) ?? [],
  }))
}
