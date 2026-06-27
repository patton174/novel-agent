import i18n from '@/i18n'
import type { Novel } from '../types/novel'
import { BRAND_NAME } from '@/lib/brand'

export function buildWelcomeMessage(novel: Novel | null | undefined): string {
  if (!novel) {
    return i18n.t('dashboard:welcome.noNovel', { brand: BRAND_NAME })
  }

  const lines = [i18n.t('dashboard:welcome.withNovel', { title: novel.title })]
  if (novel.description?.trim()) {
    lines.push('', i18n.t('dashboard:welcome.withDescription'))
  } else {
    lines.push('', i18n.t('dashboard:welcome.withoutDescription'))
  }
  lines.push('', i18n.t('dashboard:welcome.instructions'))
  return lines.join('\n')
}
