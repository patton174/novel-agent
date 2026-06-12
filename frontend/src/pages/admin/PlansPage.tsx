import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Pencil, Plus, Star } from 'lucide-react'
import {
  createAdminPlan,
  deactivateAdminPlan,
  fetchAdminPlans,
  formatPlanPrice,
  formatTokenQuota,
  PLAN_FEATURE_OPTIONS,
  updateAdminPlan,
  type AdminPlan,
  type AdminPlanUpsertPayload,
} from '@/api/billingAdminApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableFrame } from '@/components/layout/DataTableFrame'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/confirmDialogStore'
import { cn } from '@/lib/utils'
import { APP_MODAL_FORM } from '@/lib/appModalClasses'

const emptyForm = (): AdminPlanUpsertPayload => ({
  code: '',
  name: '',
  description: '',
  priceCents: 0,
  currency: 'CNY',
  monthlyTokenQuota: 10000,
  monthlyRunQuota: 50,
  rateLimitRpm: 60,
  isFeatured: false,
  sortOrder: 1,
  features: ['basic_editor'],
})

export default function PlansPage() {
  useMarkRouteSeen()
  const [plans, setPlans] = useState<AdminPlan[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminPlan | null>(null)
  const [form, setForm] = useState<AdminPlanUpsertPayload>(emptyForm())
  const [saving, setSaving] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      setPlans(await fetchAdminPlans())
    } catch (err) {
      setPlans([])
      appToast.error(err instanceof Error ? err.message : '加载套餐失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (plan: AdminPlan) => {
    setEditing(plan)
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      currency: plan.currency,
      monthlyTokenQuota: plan.monthlyTokenQuota,
      monthlyRunQuota: plan.monthlyRunQuota,
      rateLimitRpm: plan.rateLimitRpm,
      isFeatured: plan.isFeatured,
      sortOrder: plan.sortOrder,
      features: [...plan.features],
    })
    setDialogOpen(true)
  }

  const toggleFeature = (key: string) => {
    setForm((prev) => {
      const features = prev.features ?? []
      const next = features.includes(key)
        ? features.filter((f) => f !== key)
        : [...features, key]
      return { ...prev, features: next }
    })
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      appToast.error('请填写 code 与名称')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateAdminPlan(editing.id, form)
        setPlans((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null)
        appToast.success('套餐已更新')
      } else {
        const created = await createAdminPlan(form)
        setPlans((prev) => [...(prev ?? []), created])
        appToast.success('套餐已创建')
      }
      setDialogOpen(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (plan: AdminPlan) => {
    if (
      !(await confirmAction({
        title: '停用套餐',
        description: `确定停用「${plan.name}」？Pricing 页将不再展示。`,
        confirmLabel: '停用',
        danger: true,
      }))
    ) {
      return
    }
    try {
      await deactivateAdminPlan(plan.id)
      await loadPlans()
      appToast.success('套餐已停用')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '停用失败')
    }
  }

  if (loading) {
    return (
      <AppPageStack>
        <AppShellCard>
          <AppShellCardHeader title="套餐列表" description="加载中…" />
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        </AppShellCard>
      </AppPageStack>
    )
  }

  return (
    <AppPageStack>
      <AppShellCard>
        <AppShellCardHeader
          title="套餐列表"
          description="修改价格或配额后，Pricing / Billing 页刷新即生效。"
          action={
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              新建套餐
            </Button>
          }
        />

        {/* 移动端卡片 */}
        <div className="space-y-3 px-4 pb-4 md:hidden">
          {(plans ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无套餐</p>
          ) : (
            (plans ?? []).map((plan) => (
              <article
                key={plan.id}
                className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {plan.name}
                      {plan.isFeatured ? (
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{plan.code}</p>
                  </div>
                  <Badge variant={plan.isActive ? 'secondary' : 'outline'}>
                    {plan.isActive ? '上架' : '停用'}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">月价</dt>
                    <dd className="tabular-nums font-medium">{formatPlanPrice(plan.priceCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Token</dt>
                    <dd className="tabular-nums">{formatTokenQuota(plan.monthlyTokenQuota)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Run</dt>
                    <dd className="tabular-nums">
                      {plan.monthlyRunQuota == null ? '不限' : plan.monthlyRunQuota}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">RPM</dt>
                    <dd className="tabular-nums">{plan.rateLimitRpm}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                    <Pencil className="mr-1 size-3.5" />
                    编辑
                  </Button>
                  {plan.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void handleDeactivate(plan)}
                    >
                      停用
                    </Button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>

        <DataTableFrame embedded className="hidden md:block">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">套餐</th>
              <th className="px-4 py-3 font-medium">月价</th>
              <th className="px-4 py-3 font-medium">Token 配额</th>
              <th className="px-4 py-3 font-medium">Run 配额</th>
              <th className="px-4 py-3 font-medium">RPM</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(plans ?? []).map((plan) => (
              <tr key={plan.id} className="bg-background">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {plan.name}
                        {plan.isFeatured ? (
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        ) : null}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{plan.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatPlanPrice(plan.priceCents)}</td>
                <td className="px-4 py-3 tabular-nums">{formatTokenQuota(plan.monthlyTokenQuota)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {plan.monthlyRunQuota == null ? '不限' : plan.monthlyRunQuota}
                </td>
                <td className="px-4 py-3 tabular-nums">{plan.rateLimitRpm}</td>
                <td className="px-4 py-3">
                  <Badge variant={plan.isActive ? 'secondary' : 'outline'}>
                    {plan.isActive ? '上架' : '停用'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                      <Pencil className="mr-1 size-3.5" />
                      编辑
                    </Button>
                    {plan.isActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void handleDeactivate(plan)}
                      >
                        停用
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableFrame>
      </AppShellCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn('max-h-[90vh] overflow-y-auto sm:max-w-lg', APP_MODAL_FORM)}>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑套餐' : '新建套餐'}</DialogTitle>
            <DialogDescription>调整价格、配额与功能项，保存后立即对用户可见。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="plan-code" className="text-sm font-medium">
                Code
              </label>
              <Input
                id="plan-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                disabled={Boolean(editing)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="plan-name" className="text-sm font-medium">
                名称
              </label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="plan-price" className="text-sm font-medium">
                  月价（元）
                </label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={
                    form.priceCents != null && form.priceCents !== 0
                      ? (form.priceCents / 100).toFixed(2)
                      : form.priceCents === 0
                        ? '0'
                        : ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      setForm((f) => ({ ...f, priceCents: 0 }))
                      return
                    }
                    const yuan = Number(raw)
                    setForm((f) => ({
                      ...f,
                      priceCents: Number.isFinite(yuan) ? Math.round(yuan * 100) : 0,
                    }))
                  }}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="plan-sort" className="text-sm font-medium">
                  排序
                </label>
                <Input
                  id="plan-sort"
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="plan-tokens" className="text-sm font-medium">
                  月 Token 配额
                </label>
                <Input
                  id="plan-tokens"
                  type="number"
                  value={form.monthlyTokenQuota ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      monthlyTokenQuota: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="plan-runs" className="text-sm font-medium">
                  月 Run 配额
                </label>
                <Input
                  id="plan-runs"
                  type="number"
                  value={form.monthlyRunQuota ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      monthlyRunQuota: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">功能项</span>
              <div className="flex flex-wrap gap-2">
                {PLAN_FEATURE_OPTIONS.map((opt) => {
                  const checked = (form.features ?? []).includes(opt.key)
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleFeature(opt.key)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.isFeatured)}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
              设为主推套餐（Pricing 页高亮）
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageStack>
  )
}
