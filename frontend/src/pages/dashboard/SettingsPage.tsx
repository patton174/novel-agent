import { Navigate } from 'react-router-dom'

/** 账户设置已合并至侧边栏用户卡弹窗，旧路由重定向 */
export default function SettingsPage() {
  return <Navigate to="/dashboard" replace />
}
