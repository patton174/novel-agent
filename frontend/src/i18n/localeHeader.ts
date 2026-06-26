import i18n from './index'

/** 与后端 AppLocale 对齐的 API Locale tag。 */
export function apiLocaleTag(): string {
  return i18n.language === 'en' ? 'en' : 'zh-CN'
}

export function apiLocaleHeaders(): Record<string, string> {
  const tag = apiLocaleTag()
  return {
    'Accept-Language': tag,
    'X-App-Locale': tag,
  }
}
