export type SettingsSection = 'profile' | 'models' | 'preferences' | 'referral' | 'feedback'

export const SETTINGS_SECTIONS: SettingsSection[] = [
  'profile',
  'models',
  'preferences',
  'referral',
  'feedback',
]

export function isSettingsSection(value: string | undefined): value is SettingsSection {
  return SETTINGS_SECTIONS.includes(value as SettingsSection)
}

export const SETTINGS_DEFAULT_SECTION: SettingsSection = 'profile'
