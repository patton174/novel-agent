import i18n from '@/i18n'
import { appToast } from '../stores/appToastStore'

export async function copyToClipboard(
  text: string,
  successMessage?: string,
): Promise<boolean> {
  const value = text ?? ''
  if (!value.trim()) {
    appToast.info(i18n.t('common:clipboard.empty'))
    return false
  }
  try {
    await navigator.clipboard.writeText(value)
    appToast.success(successMessage ?? i18n.t('common:clipboard.copied'))
    return true
  } catch {
    appToast.error(i18n.t('common:clipboard.fail'))
    return false
  }
}
