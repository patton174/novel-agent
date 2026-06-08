import '../styles/globals.css'

import { useEffect, Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchUserInfo } from '../api/userApi'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { MobileAdminDrawer } from '../components/admin/MobileAdminDrawer'
import { LayoutOutletSkeleton } from '../components/loading/LayoutOutletSkeleton'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useUserStore } from '../stores/userStore'

const PAGE_META: Record<string, { title: string; description?: string }> = {
  '/admin': { title: '管理概览', description: '平台与用户数据总览' },
  '/admin/users': { title: '用户管理', description: '搜索、查看与编辑用户' },
  '/admin/plans': { title: '套餐管理', description: '价格、配额与功能配置' },
  '/admin/revenue': { title: '收入与成本', description: 'MRR、Token 消耗与 LLM 成本' },
  '/admin/site-content': { title: '站点内容', description: '隐私政策、协议与系统公告' },
  '/admin/audit-log': { title: '审计日志', description: '管理员操作追溯' },
  '/admin/system-settings': { title: '系统参数', description: '注册开关、默认模型与平台限制' },
  '/admin/stats': { title: '平台统计', description: '注册与 Agent 调用趋势' },
  '/admin/crawler': { title: 'AI 爬虫', description: '主编排与子任务调度' },
  '/admin/catalog': { title: '书库', description: '入库书籍与章节管理' },
}

export default function AdminLayout() {
  const location = useLocation()
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

  useEffect(() => {
    if (profile) {
      return
    }
    let cancelled = false
    void fetchUserInfo()
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
        }
      })
      .catch(() => {
        /* profile optional for layout shell */
      })
    return () => {
      cancelled = true
    }
  }, [profile, setProfile])

  const meta = PAGE_META[location.pathname] ?? { title: '管理后台' }
  const initials = profile?.username?.slice(0, 2).toUpperCase() || '?'

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AdminSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MobileAdminDrawer />
            <div className="min-w-0">
            <h1 className="text-base font-semibold leading-none">{meta.title}</h1>
            {meta.description ? (
              <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
            ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/dashboard">
                <ArrowLeft className="size-4" />
                返回用户端
              </Link>
            </Button>
            <Badge variant="secondary">管理员</Badge>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile?.username || '管理员'}
              </span>
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<LayoutOutletSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
