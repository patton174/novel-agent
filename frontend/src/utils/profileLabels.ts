import i18n from '@/i18n'

/** Friendly label for a profile_id — editor:agent.timeline.subagent.profile.* */
export function resolveProfileLabel(profileId: string | undefined): string {
  const id = profileId?.trim()
  if (!id) {
    return i18n.t('editor:agent.timeline.subagent.profile.fallback')
  }
  const key = `editor:agent.timeline.subagent.profile.${id}`
  const translated = i18n.t(key, { defaultValue: '' })
  if (translated && translated !== key) {
    return translated
  }
  return id
}

/** Title line: display name · short description */
export function formatProfileHeadline(
  displayName: string,
  description?: string,
): string {
  const name = displayName.trim()
  const desc = description?.trim()
  if (!name) return desc ?? ''
  if (!desc || desc === name) return name
  return `${name} · ${desc}`
}
