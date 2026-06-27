/** 与 novel-studio SiteSettingsBiz.ALLOWED_KEYS 对齐的可编辑运行参数 */
export type SiteSettingFieldType = 'boolean' | 'number'

export interface SiteSettingFieldDef {
  key: string
  type: SiteSettingFieldType
  labelKey: string
  descriptionKey: string
  groupKey: 'registration'
  min?: number
  max?: number
}

export const SITE_SETTING_FIELDS: SiteSettingFieldDef[] = [
  {
    key: 'registration.enabled',
    type: 'boolean',
    labelKey: 'admin:settings.regEnabled',
    descriptionKey: 'admin:settings.regEnabledDesc',
    groupKey: 'registration',
  },
  {
    key: 'registration.require_email_verify',
    type: 'boolean',
    labelKey: 'admin:settings.regVerify',
    descriptionKey: 'admin:settings.regVerifyDesc',
    groupKey: 'registration',
  },
]

export const SITE_SETTING_KEYS = SITE_SETTING_FIELDS.map((f) => f.key)

export const SITE_SETTING_GROUPS: Array<{ key: SiteSettingFieldDef['groupKey']; titleKey: string; descKey: string }> = [
  { key: 'registration', titleKey: 'admin:settings.groupRegistration', descKey: 'admin:settings.groupRegistrationDesc' },
]

export function pickSiteSettings(values: Record<string, boolean | string | number>): Record<string, boolean | string | number> {
  const picked: Record<string, boolean | string | number> = {}
  for (const key of SITE_SETTING_KEYS) {
    if (key in values) {
      picked[key] = values[key]
    }
  }
  return picked
}
