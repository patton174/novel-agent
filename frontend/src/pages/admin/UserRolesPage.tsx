import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Shield } from 'lucide-react'
import { fetchUserPage } from '@/api/adminApi'
import type { UserRole } from '@/stores/userStore'
import { AdminButtonGhost } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
} from '@/components/layout/AdminDataLayout'
import { PixelBadge, PIXEL_PANEL } from '@/components/pixel'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const ROLES: UserRole[] = ['user', 'vip', 'admin']

const ROLE_LABEL: Record<UserRole, 'admin:users.roleUser' | 'admin:users.roleVip' | 'admin:users.roleAdmin'> = {
  user: 'admin:users.roleUser',
  vip: 'admin:users.roleVip',
  admin: 'admin:users.roleAdmin',
}

export default function UserRolesPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [counts, setCounts] = useState<Partial<Record<UserRole, number>> | null>(null)
  const [totalUsers, setTotalUsers] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const head = await fetchUserPage({ pageCurrent: 1, pageSize: 1 })
        if (cancelled) return
        setTotalUsers(head.totalCount)
        const sampleSize = Math.min(head.totalCount, 500)
        if (sampleSize === 0) {
          setCounts({ user: 0, vip: 0, admin: 0 })
          return
        }
        const sample = await fetchUserPage({ pageCurrent: 1, pageSize: sampleSize })
        if (cancelled) return
        const next: Partial<Record<UserRole, number>> = { user: 0, vip: 0, admin: 0 }
        for (const u of sample.list) {
          next[u.role] = (next[u.role] ?? 0) + 1
        }
        setCounts(next)
      } catch {
        if (!cancelled) {
          setCounts(null)
          setTotalUsers(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const countHint = useMemo(() => {
    if (totalUsers == null || totalUsers <= 500) return null
    return t('admin:roles.sampleHint', { sampled: 500, total: totalUsers })
  }, [t, totalUsers])

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:roles.title')}
          description={t('admin:roles.desc')}
          action={
            <AdminButtonGhost asChild>
              <Link to="/admin/users">
                {t('admin:roles.openUsers')}
                <ArrowRight className="size-3.5" />
              </Link>
            </AdminButtonGhost>
          }
        />
        <AdminDataPanelBody className="space-y-3">
          {countHint ? <p className="text-xs text-muted-foreground">{countHint}</p> : null}
          <div className="grid gap-3 md:grid-cols-3">
            {ROLES.map((role) => (
              <div key={role} className={cn(PIXEL_PANEL, 'flex flex-col gap-3 p-4')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-primary" aria-hidden />
                    <h3 className="font-semibold text-foreground">{t(ROLE_LABEL[role])}</h3>
                  </div>
                  <PixelBadge tone={role === 'admin' ? 'warning' : role === 'vip' ? 'success' : 'muted'}>
                    {role}
                  </PixelBadge>
                </div>
                <p className="text-sm text-muted-foreground">{t(`admin:roles.${role}Desc`)}</p>
                <p className="text-xs text-muted-foreground">{t(`admin:roles.${role}Capabilities`)}</p>
                {counts === null ? (
                  <Skeleton className="h-7 w-20 rounded-md" />
                ) : (
                  <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                    {(counts[role] ?? 0).toLocaleString('zh-CN')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">{t('admin:roles.userCount')}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('admin:roles.assignHint')}</p>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
