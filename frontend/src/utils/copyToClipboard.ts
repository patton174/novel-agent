import { appToast } from '../stores/appToastStore'

export async function copyToClipboard(
  text: string,
  successMessage = '已复制到剪贴板',
): Promise<boolean> {
  const value = text ?? ''
  if (!value.trim()) {
    appToast.info('没有可复制的内容')
    return false
  }
  try {
    await navigator.clipboard.writeText(value)
    appToast.success(successMessage)
    return true
  } catch {
    appToast.error('复制失败')
    return false
  }
}
