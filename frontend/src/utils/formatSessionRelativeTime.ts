import i18n from '@/i18n'

export function formatSessionRelativeTime(date: Date, now = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - date.getTime())
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return i18n.t('common:relativeTime.justNow')
  if (diffMin < 60) return i18n.t('common:relativeTime.minutesAgo', { count: diffMin })
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return i18n.t('common:relativeTime.hoursAgo', { count: diffHr })
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((startToday.getTime() - startDate.getTime()) / 86_400_000)
  if (diffDays === 1) return i18n.t('common:relativeTime.yesterday')
  if (diffDays < 7) return i18n.t('common:relativeTime.daysAgo', { count: diffDays })
  return i18n.t('common:relativeTime.shortDate', {
    month: date.getMonth() + 1,
    day: date.getDate(),
  })
}
