import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Gift } from 'lucide-react'
import {
  createAdminGiftCampaign,
  disableAdminGiftCampaign,
  fetchAdminGiftCampaigns,
  generateAdminGiftCodes,
  updateAdminGiftCampaign,
  type AdminGiftCampaign,
  type AdminGiftCampaignUpsertPayload,
  type GiftType,
} from '@/api/giftAdminApi'
import { fetchAdminPlans, type AdminPlan } from '@/api/billingAdminApi'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '@/api/inviteAdminApi'
import {
  AdminButton,
  AdminButtonOutline,
  AdminDateTimeInput,
  AdminField,
  AdminFormStack,
  AdminSelect,
  AdminStatusBadge,
  AdminTextInput,
  adminFormRowClass,
} from '@/components/admin/AdminFormControls'
import {
  PixelCellStack,
  PixelCellText,
  PixelTable,
  PixelTableActionBar,
  PixelTableActionButton,
  type PixelColumn,
} from '@/components/pixel'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
} from '@/components/layout/AdminDataLayout'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { confirmAction } from '@/stores/appDialog'
import { copyToClipboard } from '@/utils/copyToClipboard'

const GIFT_TYPES: GiftType[] = ['quota_bonus', 'plan_trial', 'license_key', 'idr_coupon']

const emptyForm = (): AdminGiftCampaignUpsertPayload => ({
  name: '',
  giftType: 'quota_bonus',
  rewardPayload: {},
  maxRedemptions: null,
  expiresAt: null,
})

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toLocaleString(locale)
}

export default function GiftCampaignsPage() {
  const { t, i18n } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [campaigns, setCampaigns] = useState<AdminGiftCampaign[] | null>(null)
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [editing, setEditing] = useState<AdminGiftCampaign | null>(null)
  const [generatingFor, setGeneratingFor] = useState<AdminGiftCampaign | null>(null)
  const [form, setForm] = useState<AdminGiftCampaignUpsertPayload>(emptyForm())
  const [generateCount, setGenerateCount] = useState(10)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const [list, planList] = await Promise.all([fetchAdminGiftCampaigns(), fetchAdminPlans()])
      setCampaigns(list)
      setPlans(planList)
    } catch (err) {
      setCampaigns([])
      appToast.error(err instanceof Error ? err.message : t('admin:gift.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (item: AdminGiftCampaign) => {
    setEditing(item)
    setForm({
      name: item.name,
      giftType: item.giftType,
      rewardPayload: item.rewardPayload ? { ...item.rewardPayload } : {},
      maxRedemptions: item.maxRedemptions,
      expiresAt: item.expiresAt,
    })
    setDialogOpen(true)
  }

  const openGenerate = (item: AdminGiftCampaign) => {
    setGeneratingFor(item)
    setGenerateCount(10)
    setGeneratedCodes([])
    setGenerateOpen(true)
  }

  const updateRewardPayload = (patch: Record<string, number | string | null | undefined>) => {
    setForm((prev) => ({
      ...prev,
      rewardPayload: { ...(prev.rewardPayload ?? {}), ...patch },
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      appToast.error(t('admin:gift.fillRequired'))
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateAdminGiftCampaign(editing.id, form)
        appToast.success(t('admin:gift.updated'))
      } else {
        await createAdminGiftCampaign(form)
        appToast.success(t('admin:gift.created'))
      }
      await loadCampaigns()
      setDialogOpen(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:gift.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async (item: AdminGiftCampaign) => {
    if (
      !(await confirmAction({
        title: t('admin:gift.disableTitle'),
        description: t('admin:gift.disableDesc', { name: item.name }),
        confirmLabel: t('admin:gift.disableBtn'),
        danger: true,
      }))
    ) {
      return
    }
    try {
      await disableAdminGiftCampaign(item.id)
      await loadCampaigns()
      appToast.success(t('admin:gift.disabled'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:gift.disableFail'))
    }
  }

  const handleGenerate = async () => {
    if (!generatingFor) {
      return
    }
    if (generateCount < 1 || generateCount > 500) {
      appToast.error(t('admin:gift.generateCountInvalid'))
      return
    }
    setGenerating(true)
    try {
      const result = await generateAdminGiftCodes(generatingFor.id, generateCount)
      setGeneratedCodes(result.codes)
      await loadCampaigns()
      appToast.success(t('admin:gift.generated', { count: result.codes.length }))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:gift.generateFail'))
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyCodes = async () => {
    if (generatedCodes.length === 0) {
      return
    }
    const ok = await copyToClipboard(generatedCodes.join('\n'))
    if (ok) {
      appToast.success(t('admin:gift.copied'))
    } else {
      appToast.error(t('admin:gift.copyFail'))
    }
  }

  const giftTypeLabel = (type: GiftType) => t(`admin:gift.giftType.${type}`)

  const list = campaigns ?? []

  const columns = useMemo((): PixelColumn<AdminGiftCampaign>[] => {
    return [
      {
        key: 'name',
        header: t('admin:gift.colName'),
        render: (item) => <PixelCellStack title={item.name} subtitle={giftTypeLabel(item.giftType)} />,
      },
      {
        key: 'codes',
        header: t('admin:gift.colCodes'),
        render: (item) => (
          <PixelCellText muted>
            {t('admin:gift.codesSummary', {
              codes: item.codeCount,
              redeemed: item.redeemedCount,
            })}
          </PixelCellText>
        ),
      },
      {
        key: 'expires',
        header: t('admin:gift.colExpires'),
        render: (item) => (
          <PixelCellText muted>{formatDateTime(item.expiresAt, i18n.language)}</PixelCellText>
        ),
      },
      {
        key: 'status',
        header: t('admin:gift.colStatus'),
        render: (item) => (
          <AdminStatusBadge tone={item.status === 'active' ? 'success' : 'neutral'}>
            {t(`admin:gift.status.${item.status}`)}
          </AdminStatusBadge>
        ),
      },
      {
        key: 'actions',
        header: t('admin:gift.colActions'),
        className: 'min-w-[280px]',
        render: (item) => (
          <PixelTableActionBar>
            <PixelTableActionButton onClick={() => openEdit(item)}>
              {t('admin:gift.edit')}
            </PixelTableActionButton>
            <PixelTableActionButton onClick={() => openGenerate(item)}>
              {t('admin:gift.generateBtn')}
            </PixelTableActionButton>
            {item.status === 'active' ? (
              <PixelTableActionButton variant="danger" onClick={() => void handleDisable(item)}>
                {t('admin:gift.disableBtn')}
              </PixelTableActionButton>
            ) : null}
          </PixelTableActionBar>
        ),
      },
    ]
  }, [giftTypeLabel, handleDisable, i18n.language, openEdit, openGenerate, t])

  if (loading) {
    return (
      <AdminDataPage>
        <AdminDataPanel>
          <AdminDataPanelHeader title={t('admin:gift.title')} description={t('admin:gift.loading')} />
          <AdminDataPanelBody>
            <Skeleton className="h-40 w-full rounded-lg" />
          </AdminDataPanelBody>
        </AdminDataPanel>
      </AdminDataPage>
    )
  }

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:gift.title')}
          description={t('admin:gift.desc')}
          action={
            <AdminButton type="button" onClick={openCreate}>
              <Gift size={16} className="mr-1.5" />
              {t('admin:gift.createBtn')}
            </AdminButton>
          }
        />
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center font-mono text-sm text-muted-foreground">
            {t('admin:gift.empty')}
          </p>
        ) : (
          <PixelTable columns={columns} data={list} rowKey="id" emptyText={t('admin:gift.empty')} />
        )}
      </AdminDataPanel>

      <AppModalShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        size="form"
        className="max-h-[90vh]"
        title={editing ? t('admin:gift.editTitle') : t('admin:gift.createTitle')}
        description={t('admin:gift.formDesc')}
      >
        <AdminFormStack>
          <AdminField layout="form" label={t('admin:gift.formName')} htmlFor="gift-name">
            <AdminTextInput
              id="gift-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </AdminField>
          <AdminField layout="form" label={t('admin:gift.formGiftType')} htmlFor="gift-type">
            <AdminSelect
              id="gift-type"
              value={form.giftType}
              disabled={Boolean(editing)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  giftType: e.target.value as GiftType,
                  rewardPayload: {},
                }))
              }
            >
              {GIFT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {giftTypeLabel(type)}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          {form.giftType === 'quota_bonus' ? (
            <div className={adminFormRowClass}>
              <AdminField layout="form" label={t('admin:gift.formTokenBonus')} htmlFor="gift-token-bonus">
                <AdminTextInput
                  id="gift-token-bonus"
                  type="number"
                  min={0}
                  value={form.rewardPayload?.tokenBonus ?? ''}
                  onChange={(e) =>
                    updateRewardPayload({
                      tokenBonus: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </AdminField>
              <AdminField layout="form" label={t('admin:gift.formRunBonus')} htmlFor="gift-run-bonus">
                <AdminTextInput
                  id="gift-run-bonus"
                  type="number"
                  min={0}
                  value={form.rewardPayload?.runBonus ?? ''}
                  onChange={(e) =>
                    updateRewardPayload({
                      runBonus: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </AdminField>
            </div>
          ) : null}
          {form.giftType === 'plan_trial' ? (
            <div className={adminFormRowClass}>
              <AdminField layout="form" label={t('admin:gift.formPlanCode')} htmlFor="gift-plan-code">
                <AdminSelect
                  id="gift-plan-code"
                  value={form.rewardPayload?.planCode ?? ''}
                  onChange={(e) => updateRewardPayload({ planCode: e.target.value || null })}
                >
                  <option value="">{t('admin:gift.formPlanPlaceholder')}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name} ({plan.code})
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
              <AdminField layout="form" label={t('admin:gift.formTrialDays')} htmlFor="gift-trial-days">
                <AdminTextInput
                  id="gift-trial-days"
                  type="number"
                  min={1}
                  value={form.rewardPayload?.days ?? ''}
                  onChange={(e) =>
                    updateRewardPayload({
                      days: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </AdminField>
            </div>
          ) : null}
          {form.giftType === 'license_key' ? (
            <div className={adminFormRowClass}>
              <AdminField layout="form" label={t('admin:gift.formIdrProject')} htmlFor="gift-idr-project">
                <AdminTextInput
                  id="gift-idr-project"
                  value={form.rewardPayload?.idrProjectId ?? ''}
                  onChange={(e) => updateRewardPayload({ idrProjectId: e.target.value || null })}
                />
              </AdminField>
              <AdminField layout="form" label={t('admin:gift.formIdrSku')} htmlFor="gift-idr-sku">
                <AdminTextInput
                  id="gift-idr-sku"
                  value={form.rewardPayload?.idrSkuId ?? ''}
                  onChange={(e) => updateRewardPayload({ idrSkuId: e.target.value || null })}
                />
              </AdminField>
            </div>
          ) : null}
          {form.giftType === 'idr_coupon' ? (
            <AdminField layout="form" label={t('admin:gift.formCouponCode')} htmlFor="gift-coupon-code">
              <AdminTextInput
                id="gift-coupon-code"
                value={form.rewardPayload?.couponCode ?? ''}
                onChange={(e) => updateRewardPayload({ couponCode: e.target.value || null })}
              />
            </AdminField>
          ) : null}
          <div className={adminFormRowClass}>
            <AdminField
              layout="form"
              label={t('admin:gift.formMaxRedemptions')}
              htmlFor="gift-max-redemptions"
              hint={t('admin:gift.formMaxRedemptionsHint')}
            >
              <AdminTextInput
                id="gift-max-redemptions"
                type="number"
                min={0}
                value={form.maxRedemptions ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxRedemptions: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
              />
            </AdminField>
            <AdminField layout="form" label={t('admin:gift.formExpires')} htmlFor="gift-expires">
              <AdminDateTimeInput
                id="gift-expires"
                value={toDatetimeLocalValue(form.expiresAt ?? null)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiresAt: fromDatetimeLocalValue(e.target.value) }))
                }
              />
            </AdminField>
          </div>
        </AdminFormStack>

        <DialogFooter className="gap-2 sm:gap-2 sm:items-center">
          <AdminButtonOutline type="button" onClick={() => setDialogOpen(false)}>
            {t('admin:gift.cancel')}
          </AdminButtonOutline>
          <AdminButton type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? t('admin:gift.saving') : t('admin:gift.save')}
          </AdminButton>
        </DialogFooter>
      </AppModalShell>

      <AppModalShell
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        size="form"
        title={t('admin:gift.generateTitle')}
        description={
          generatingFor
            ? t('admin:gift.generateDesc', { name: generatingFor.name })
            : t('admin:gift.generateDescGeneric')
        }
      >
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label htmlFor="gift-generate-count" className="text-sm font-medium">
              {t('admin:gift.generateCount')}
            </label>
            <Input
              id="gift-generate-count"
              type="number"
              min={1}
              max={500}
              value={generateCount}
              onChange={(e) => setGenerateCount(Number(e.target.value))}
            />
          </div>
          {generatedCodes.length > 0 ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t('admin:gift.generatedCodes')}</span>
                <AdminButtonOutline type="button" size="sm" onClick={() => void handleCopyCodes()}>
                  <Copy size={14} className="mr-1" />
                  {t('admin:gift.copyAll')}
                </AdminButtonOutline>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 font-mono text-xs">
                {generatedCodes.map((code) => (
                  <div key={code}>{code}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <AdminButtonOutline type="button" onClick={() => setGenerateOpen(false)}>
            {t('admin:gift.close')}
          </AdminButtonOutline>
          <AdminButton type="button" onClick={() => void handleGenerate()} disabled={generating}>
            {generating ? t('admin:gift.generating') : t('admin:gift.generateConfirm')}
          </AdminButton>
        </DialogFooter>
      </AppModalShell>
    </AdminDataPage>
  )
}
