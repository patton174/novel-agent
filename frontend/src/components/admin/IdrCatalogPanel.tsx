import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, RefreshCw, Save, Ticket, Tags } from 'lucide-react'
import {
  createIdrCoupon,
  createIdrPricing,
  createIdrSku,
  fetchIdrProjectDetail,
  resolveSkuStockCount,
  updateIdrCoupon,
  updateIdrPricing,
  updateIdrSku,
  type IdrCouponItem,
  type IdrPricingItem,
  type IdrProjectDetail,
  type IdrSkuItem,
} from '@/api/idrAdminApi'
import { AdminFoldSection } from '@/components/admin/AdminFoldSection'
import {
  AdminButton,
  AdminButtonGhost,
  AdminButtonIcon,
  AdminButtonOutline,
  AdminField,
  AdminSelect,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import { PixelBadge, PixelCellMono, PixelCellStack, PixelTable, PixelTableActionBar, PixelTableActionButton, type PixelColumn } from '@/components/pixel'
import { IdrSkuInventoryModal } from '@/components/admin/IdrSkuInventoryModal'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'
import { cn } from '@/lib/utils'

const LOW_STOCK_THRESHOLD = 5

export type IdrCatalogView = 'all' | 'products' | 'inventory' | 'pricing' | 'coupon'

interface IdrCatalogPanelProps {
  projectId: string | null | undefined
  view?: IdrCatalogView
}

export function IdrCatalogPanel({ projectId, view = 'all' }: IdrCatalogPanelProps) {
  const { t } = useTranslation(['admin'])
  const [detail, setDetail] = useState<IdrProjectDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inventorySku, setInventorySku] = useState<IdrSkuItem | null>(null)
  const [showSkuForm, setShowSkuForm] = useState(false)
  const [skuName, setSkuName] = useState('')
  const [skuStatus, setSkuStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE')
  const [skuQuantity, setSkuQuantity] = useState('')
  const [creatingSku, setCreatingSku] = useState(false)
  const [showPricingForm, setShowPricingForm] = useState(false)
  const [pricingScope, setPricingScope] = useState<'global' | 'specific'>('global')
  const [pricingSkuId, setPricingSkuId] = useState('')
  const [pricingPrice, setPricingPrice] = useState('')
  const [creatingPricing, setCreatingPricing] = useState(false)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [couponScope, setCouponScope] = useState<'global' | 'specific'>('global')
  const [couponSkuId, setCouponSkuId] = useState('')
  const [couponPolicy, setCouponPolicy] = useState<'reduction' | 'discount' | 'fixed'>('reduction')
  const [couponValue, setCouponValue] = useState('')
  const [creatingCoupon, setCreatingCoupon] = useState(false)
  const [editSku, setEditSku] = useState<IdrSkuItem | null>(null)
  const [editSkuName, setEditSkuName] = useState('')
  const [editSkuStatus, setEditSkuStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE')
  const [editPricing, setEditPricing] = useState<IdrPricingItem | null>(null)
  const [editPricingPrice, setEditPricingPrice] = useState('')
  const [editPricingStatus, setEditPricingStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE')
  const [savingEdit, setSavingEdit] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadDetail = useCallback(async () => {
    const pid = projectId?.trim()
    if (!pid) {
      setDetail(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setDetail(await fetchIdrProjectDetail(pid))
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : t('admin:products.catalogDetailFail'))
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const stats = useMemo(() => {
    const skus = detail?.skus ?? []
    let totalStock = 0
    let lowStock = 0
    for (const sku of skus) {
      const count = resolveSkuStockCount(sku)
      if (count != null) {
        totalStock += count
        if (count <= LOW_STOCK_THRESHOLD) lowStock += 1
      }
    }
    return {
      skuCount: skus.length,
      totalStock,
      lowStock,
      pricingCount: detail?.pricings.length ?? 0,
      couponCount: detail?.coupons.length ?? 0,
    }
  }, [detail])

  const pid = projectId?.trim() ?? ''

  const openEditSku = (sku: IdrSkuItem) => {
    setEditSku(sku)
    setEditSkuName(sku.name ?? '')
    setEditSkuStatus(sku.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE')
  }

  const openEditPricing = (pricing: IdrPricingItem) => {
    setEditPricing(pricing)
    setEditPricingPrice(pricing.price != null ? String(pricing.price) : '')
    setEditPricingStatus(pricing.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE')
  }

  const handleSaveSkuEdit = async () => {
    if (!editSku?.id || !editSkuName.trim()) {
      appToast.error(t('admin:products.createSkuNeedName'))
      return
    }
    setSavingEdit(true)
    try {
      await updateIdrSku(editSku.id, {
        name: editSkuName.trim(),
        status: editSkuStatus,
      })
      setEditSku(null)
      appToast.success(t('admin:products.updateSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.updateFail'))
    } finally {
      setSavingEdit(false)
    }
  }

  const handleSavePricingEdit = async () => {
    if (!editPricing?.id || !editPricingPrice.trim()) {
      appToast.error(t('admin:products.createPricingNeedPrice'))
      return
    }
    setSavingEdit(true)
    try {
      await updateIdrPricing(editPricing.id, {
        price: editPricingPrice.trim(),
        status: editPricingStatus,
      })
      setEditPricing(null)
      appToast.success(t('admin:products.updateSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.updateFail'))
    } finally {
      setSavingEdit(false)
    }
  }

  const toggleSkuStatus = async (sku: IdrSkuItem) => {
    if (!sku.id) return
    const next = sku.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
    setTogglingId(sku.id)
    try {
      await updateIdrSku(sku.id, { status: next })
      appToast.success(t('admin:products.updateSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.updateFail'))
    } finally {
      setTogglingId(null)
    }
  }

  const toggleCouponStatus = async (coupon: IdrCouponItem) => {
    if (!coupon.id) return
    const next = coupon.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
    setTogglingId(coupon.id)
    try {
      await updateIdrCoupon(coupon.id, { status: next })
      appToast.success(t('admin:products.updateSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.updateFail'))
    } finally {
      setTogglingId(null)
    }
  }

  const togglePricingStatus = async (pricing: IdrPricingItem) => {
    if (!pricing.id) return
    const next = pricing.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
    setTogglingId(pricing.id)
    try {
      await updateIdrPricing(pricing.id, { status: next })
      appToast.success(t('admin:products.updateSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.updateFail'))
    } finally {
      setTogglingId(null)
    }
  }

  const skuColumns = useMemo((): PixelColumn<IdrSkuItem>[] => {
    return [
      {
        key: 'name',
        header: t('admin:products.colSkuName'),
        render: (sku) => <PixelCellStack title={sku.name} />,
      },
      {
        key: 'status',
        header: t('admin:products.colStatus'),
        render: (sku) => (
          <PixelBadge tone={sku.status === 'ONLINE' ? 'success' : 'muted'}>{sku.status ?? '—'}</PixelBadge>
        ),
      },
      {
        key: 'stock',
        header: t('admin:products.colStock'),
        className: 'tabular-nums',
        render: (sku) => {
          const stock = resolveSkuStockCount(sku)
          const low = stock != null && stock <= LOW_STOCK_THRESHOLD
          return (
            <PixelCellMono className={cn('font-semibold', low && 'text-amber-700')}>
              {stock ?? '—'}
            </PixelCellMono>
          )
        },
      },
      {
        key: 'sold',
        header: t('admin:products.colSold'),
        className: 'tabular-nums',
        render: (sku) => <PixelCellMono>{sku.sold ?? 0}</PixelCellMono>,
      },
      {
        key: 'actions',
        header: t('admin:products.colActions'),
        className: 'min-w-[220px]',
        render: (sku) => (
          <PixelTableActionBar>
            <PixelTableActionButton onClick={() => setInventorySku(sku)}>
              <Plus className="size-3.5" />
              {t('admin:products.inventoryAddStock')}
            </PixelTableActionButton>
            <PixelTableActionButton onClick={() => openEditSku(sku)}>
              <Pencil className="size-3.5" />
              {t('admin:products.edit')}
            </PixelTableActionButton>
            <PixelTableActionButton
              variant={sku.status === 'ONLINE' ? 'danger' : 'secondary'}
              disabled={togglingId === sku.id}
              onClick={() => void toggleSkuStatus(sku)}
            >
              {sku.status === 'ONLINE' ? t('admin:products.takeOffline') : t('admin:products.takeOnline')}
            </PixelTableActionButton>
          </PixelTableActionBar>
        ),
      },
    ]
  }, [t, togglingId])

  const pricingColumns = useMemo((): PixelColumn<IdrPricingItem>[] => {
    return [
      {
        key: 'policy',
        header: t('admin:products.colPolicy'),
        render: (row) => <PixelCellMono>{row.policy ?? '—'}</PixelCellMono>,
      },
      {
        key: 'scope',
        header: t('admin:products.colScope'),
        render: (row) => <PixelCellMono>{row.scope ?? '—'}</PixelCellMono>,
      },
      {
        key: 'price',
        header: t('admin:products.colPrice'),
        render: (row) => (
          <PixelCellMono>{row.price != null ? `$${row.price}` : '—'}</PixelCellMono>
        ),
      },
      {
        key: 'status',
        header: t('admin:products.colStatus'),
        render: (row) => (
          <PixelBadge tone={row.status === 'ONLINE' ? 'success' : 'muted'}>{row.status ?? '—'}</PixelBadge>
        ),
      },
      {
        key: 'actions',
        header: t('admin:products.colActions'),
        render: (row) => (
          <PixelTableActionBar>
            <PixelTableActionButton onClick={() => openEditPricing(row)}>
              <Pencil className="size-3.5" />
              {t('admin:products.edit')}
            </PixelTableActionButton>
            <PixelTableActionButton
              variant={row.status === 'ONLINE' ? 'danger' : 'secondary'}
              disabled={togglingId === row.id}
              onClick={() => void togglePricingStatus(row)}
            >
              {row.status === 'ONLINE' ? t('admin:products.takeOffline') : t('admin:products.takeOnline')}
            </PixelTableActionButton>
          </PixelTableActionBar>
        ),
      },
    ]
  }, [t, togglingId])

  const couponColumns = useMemo((): PixelColumn<IdrCouponItem>[] => {
    return [
      {
        key: 'code',
        header: t('admin:products.colCode'),
        render: (row) => <PixelCellMono>{row.code ?? '—'}</PixelCellMono>,
      },
      {
        key: 'policy',
        header: t('admin:products.colPolicy'),
        render: (row) => <PixelCellMono>{row.policy ?? '—'}</PixelCellMono>,
      },
      {
        key: 'scope',
        header: t('admin:products.colScope'),
        render: (row) => <PixelCellMono>{row.scope ?? '—'}</PixelCellMono>,
      },
      {
        key: 'status',
        header: t('admin:products.colStatus'),
        render: (row) => (
          <PixelBadge tone={row.status === 'ONLINE' ? 'success' : 'muted'}>{row.status ?? '—'}</PixelBadge>
        ),
      },
      {
        key: 'actions',
        header: t('admin:products.colActions'),
        render: (row) => (
          <PixelTableActionButton
            variant={row.status === 'ONLINE' ? 'danger' : 'secondary'}
            disabled={togglingId === row.id}
            onClick={() => void toggleCouponStatus(row)}
          >
            {row.status === 'ONLINE' ? t('admin:products.takeOffline') : t('admin:products.takeOnline')}
          </PixelTableActionButton>
        ),
      },
    ]
  }, [t, togglingId])

  const handleCreateSku = async () => {
    if (!pid || !skuName.trim()) {
      appToast.error(t('admin:products.createSkuNeedName'))
      return
    }
    setCreatingSku(true)
    try {
      const qty = skuQuantity.trim() ? Number(skuQuantity) : undefined
      await createIdrSku(pid, {
        name: skuName.trim(),
        status: skuStatus,
        quantity: qty != null && Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : undefined,
      })
      setSkuName('')
      setSkuQuantity('')
      setShowSkuForm(false)
      appToast.success(t('admin:products.createSkuSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.createSkuFail'))
    } finally {
      setCreatingSku(false)
    }
  }

  const handleCreatePricing = async () => {
    if (!pid || !pricingPrice.trim()) {
      appToast.error(t('admin:products.createPricingNeedPrice'))
      return
    }
    if (pricingScope === 'specific' && !pricingSkuId) {
      appToast.error(t('admin:products.createNeedSku'))
      return
    }
    setCreatingPricing(true)
    try {
      await createIdrPricing(pid, {
        scope: pricingScope,
        scopeItems: pricingScope === 'specific' ? [pricingSkuId] : undefined,
        policy: 'fixed',
        price: pricingPrice.trim(),
        status: 'ONLINE',
      })
      setPricingPrice('')
      setPricingSkuId('')
      setShowPricingForm(false)
      appToast.success(t('admin:products.createPricingSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.createPricingFail'))
    } finally {
      setCreatingPricing(false)
    }
  }

  const handleCreateCoupon = async () => {
    if (!pid) return
    const value = Number(couponValue)
    if (!Number.isFinite(value) || value <= 0) {
      appToast.error(t('admin:products.createCouponNeedValue'))
      return
    }
    if (couponScope === 'specific' && !couponSkuId) {
      appToast.error(t('admin:products.createNeedSku'))
      return
    }
    setCreatingCoupon(true)
    try {
      await createIdrCoupon(pid, {
        scope: couponScope,
        scopeItems: couponScope === 'specific' ? [couponSkuId] : undefined,
        policy: couponPolicy,
        status: 'ONLINE',
        reduction: couponPolicy === 'reduction' ? value : undefined,
        fixed: couponPolicy === 'fixed' ? value : undefined,
        discount:
          couponPolicy === 'discount' ? Math.min(100, Math.max(1, Math.round(value))) : undefined,
      })
      setCouponValue('')
      setCouponSkuId('')
      setShowCouponForm(false)
      appToast.success(t('admin:products.createCouponSuccess'))
      await loadDetail()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.createCouponFail'))
    } finally {
      setCreatingCoupon(false)
    }
  }

  if (!pid) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {t('admin:products.catalogSelectProjectHint')}
      </p>
    )
  }

  if (loading) return <Skeleton className="h-32 w-full rounded-lg" />

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-xs text-destructive">
        {error}
      </div>
    )
  }

  if (!detail) return null

  const skuOptions = detail.skus
  const showSkus = view === 'all' || view === 'products' || view === 'inventory'
  const showPricing = view === 'all' || view === 'pricing'
  const showCoupons = view === 'all' || view === 'coupon'
  const showStockStats = view === 'all' || view === 'products' || view === 'inventory'

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{detail.project.name}</p>
          <p className="truncate text-xs text-muted-foreground">{detail.project.status ?? '—'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showStockStats ? (
            <>
              <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                {t('admin:products.statTotalStock')} {stats.totalStock}
              </span>
              {stats.lowStock > 0 ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                  {t('admin:products.statLowStock')} {stats.lowStock}
                </span>
              ) : null}
            </>
          ) : null}
          <AdminButtonIcon onClick={() => void loadDetail()} aria-label={t('admin:products.catalogRefresh')}>
            <RefreshCw className="size-4" />
          </AdminButtonIcon>
          <AdminButtonGhost asChild>
            <Link to="/admin/billing/orders?status=DONE">{t('admin:products.viewRedemptions')}</Link>
          </AdminButtonGhost>
        </div>
      </div>

      <div className="space-y-3">
        {showSkus ? (
        <AdminFoldSection
          title={t('admin:products.catalogSkus')}
          defaultOpen
          badge={<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{stats.skuCount}</span>}
          action={
            <AdminButtonOutline onClick={() => setShowSkuForm((v) => !v)}>
              <Plus className="size-3.5" />
              {t('admin:products.createSku')}
            </AdminButtonOutline>
          }
        >
          {showSkuForm ? (
            <CreateFormGrid
              onSubmit={() => void handleCreateSku()}
              saving={creatingSku}
              submitLabel={t('admin:products.createSubmit')}
            >
              <AdminField label={t('admin:products.colSkuName')}>
                <AdminTextInput value={skuName} onChange={(e) => setSkuName(e.target.value)} maxLength={50} />
              </AdminField>
              <AdminField label={t('admin:products.colStatus')}>
                <AdminSelect value={skuStatus} onChange={(e) => setSkuStatus(e.target.value as 'ONLINE' | 'OFFLINE')}>
                  <option value="ONLINE">{t('admin:products.statusOnline')}</option>
                  <option value="OFFLINE">{t('admin:products.statusOffline')}</option>
                </AdminSelect>
              </AdminField>
              <AdminField label={t('admin:products.createInitialStock')}>
                <AdminTextInput
                  type="number"
                  min={0}
                  value={skuQuantity}
                  onChange={(e) => setSkuQuantity(e.target.value)}
                  placeholder={t('admin:products.createInitialStockHint')}
                />
              </AdminField>
            </CreateFormGrid>
          ) : null}
          {detail.skus.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">{t('admin:products.noSkus')}</p>
          ) : (
            <PixelTable
              columns={skuColumns}
              data={detail.skus}
              rowKey="id"
              compact
              emptyText={t('admin:products.noSkus')}
            />
          )}
        </AdminFoldSection>
        ) : null}

        {showPricing ? (
        <AdminFoldSection
          title={t('admin:products.catalogPricings')}
          badge={<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{stats.pricingCount}</span>}
          action={
            <AdminButtonOutline onClick={() => setShowPricingForm((v) => !v)}>
              <Tags className="size-3.5" />
              {t('admin:products.createPricing')}
            </AdminButtonOutline>
          }
        >
          {showPricingForm ? (
            <CreateFormGrid
              onSubmit={() => void handleCreatePricing()}
              saving={creatingPricing}
              submitLabel={t('admin:products.createSubmit')}
            >
              <AdminField label={t('admin:products.colScope')}>
                <AdminSelect
                  value={pricingScope}
                  onChange={(e) => setPricingScope(e.target.value as 'global' | 'specific')}
                >
                  <option value="global">{t('admin:products.scopeGlobal')}</option>
                  <option value="specific">{t('admin:products.scopeSpecific')}</option>
                </AdminSelect>
              </AdminField>
              {pricingScope === 'specific' ? (
                <AdminField label={t('admin:products.pickSku')}>
                  <AdminSelect value={pricingSkuId} onChange={(e) => setPricingSkuId(e.target.value)}>
                    <option value="">{t('admin:products.pickSkuPlaceholder')}</option>
                    {skuOptions.map((sku) => (
                      <option key={sku.id} value={sku.id}>
                        {sku.name}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
              ) : null}
              <AdminField label={t('admin:products.colPrice')}>
                <AdminTextInput
                  value={pricingPrice}
                  onChange={(e) => setPricingPrice(e.target.value)}
                  placeholder={t('admin:products.placeholderPrice')}
                />
              </AdminField>
            </CreateFormGrid>
          ) : null}
          {detail.pricings.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">{t('admin:products.catalogEmpty')}</p>
          ) : (
            <PixelTable
              columns={pricingColumns}
              data={detail.pricings}
              rowKey="id"
              compact
              emptyText={t('admin:products.catalogEmpty')}
            />
          )}
        </AdminFoldSection>
        ) : null}

        {showCoupons ? (
        <AdminFoldSection
          title={t('admin:products.catalogCoupons')}
          badge={<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{stats.couponCount}</span>}
          action={
            <AdminButtonOutline onClick={() => setShowCouponForm((v) => !v)}>
              <Ticket className="size-3.5" />
              {t('admin:products.createCoupon')}
            </AdminButtonOutline>
          }
        >
          {showCouponForm ? (
            <CreateFormGrid
              onSubmit={() => void handleCreateCoupon()}
              saving={creatingCoupon}
              submitLabel={t('admin:products.createSubmit')}
            >
              <AdminField label={t('admin:products.colScope')}>
                <AdminSelect
                  value={couponScope}
                  onChange={(e) => setCouponScope(e.target.value as 'global' | 'specific')}
                >
                  <option value="global">{t('admin:products.scopeGlobal')}</option>
                  <option value="specific">{t('admin:products.scopeSpecific')}</option>
                </AdminSelect>
              </AdminField>
              {couponScope === 'specific' ? (
                <AdminField label={t('admin:products.pickSku')}>
                  <AdminSelect value={couponSkuId} onChange={(e) => setCouponSkuId(e.target.value)}>
                    <option value="">{t('admin:products.pickSkuPlaceholder')}</option>
                    {skuOptions.map((sku) => (
                      <option key={sku.id} value={sku.id}>
                        {sku.name}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
              ) : null}
              <AdminField label={t('admin:products.couponPolicy')}>
                <AdminSelect
                  value={couponPolicy}
                  onChange={(e) => setCouponPolicy(e.target.value as 'reduction' | 'discount' | 'fixed')}
                >
                  <option value="reduction">{t('admin:products.couponPolicyReduction')}</option>
                  <option value="discount">{t('admin:products.couponPolicyDiscount')}</option>
                  <option value="fixed">{t('admin:products.couponPolicyFixed')}</option>
                </AdminSelect>
              </AdminField>
              <AdminField label={t('admin:products.couponValue')}>
                <AdminTextInput
                  type="number"
                  min={0}
                  value={couponValue}
                  onChange={(e) => setCouponValue(e.target.value)}
                  placeholder={
                    couponPolicy === 'discount'
                      ? t('admin:products.couponValueDiscountHint')
                      : t('admin:products.couponValueAmountHint')
                  }
                />
              </AdminField>
            </CreateFormGrid>
          ) : null}
          {detail.coupons.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">{t('admin:products.catalogEmpty')}</p>
          ) : (
            <PixelTable
              columns={couponColumns}
              data={detail.coupons}
              rowKey="id"
              compact
              emptyText={t('admin:products.catalogEmpty')}
            />
          )}
        </AdminFoldSection>
        ) : null}
      </div>

      {showSkus ? (
      <IdrSkuInventoryModal
        open={inventorySku != null}
        skuId={inventorySku?.id ?? null}
        skuName={inventorySku?.name}
        onClose={() => setInventorySku(null)}
        onSaved={() => void loadDetail()}
      />
      ) : null}

      <AppModalShell
        open={editSku != null}
        onOpenChange={(open) => {
          if (!open) setEditSku(null)
        }}
        title={t('admin:products.editSkuTitle')}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label={t('admin:products.colSkuName')}>
            <AdminTextInput value={editSkuName} onChange={(e) => setEditSkuName(e.target.value)} maxLength={50} />
          </AdminField>
          <AdminField label={t('admin:products.colStatus')}>
            <AdminSelect
              value={editSkuStatus}
              onChange={(e) => setEditSkuStatus(e.target.value as 'ONLINE' | 'OFFLINE')}
            >
              <option value="ONLINE">{t('admin:products.statusOnline')}</option>
              <option value="OFFLINE">{t('admin:products.statusOffline')}</option>
            </AdminSelect>
          </AdminField>
        </div>
        <DialogFooter className="mt-4 gap-2 sm:justify-end">
          <AdminButtonOutline size="sm" onClick={() => setEditSku(null)}>
            {t('admin:products.cancel')}
          </AdminButtonOutline>
          <AdminButton size="sm" disabled={savingEdit} onClick={() => void handleSaveSkuEdit()}>
            {t('admin:products.saveChanges')}
          </AdminButton>
        </DialogFooter>
      </AppModalShell>

      <AppModalShell
        open={editPricing != null}
        onOpenChange={(open) => {
          if (!open) setEditPricing(null)
        }}
        title={t('admin:products.editPricingTitle')}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label={t('admin:products.colPrice')}>
            <AdminTextInput value={editPricingPrice} onChange={(e) => setEditPricingPrice(e.target.value)} />
          </AdminField>
          <AdminField label={t('admin:products.colStatus')}>
            <AdminSelect
              value={editPricingStatus}
              onChange={(e) => setEditPricingStatus(e.target.value as 'ONLINE' | 'OFFLINE')}
            >
              <option value="ONLINE">{t('admin:products.statusOnline')}</option>
              <option value="OFFLINE">{t('admin:products.statusOffline')}</option>
            </AdminSelect>
          </AdminField>
        </div>
        <DialogFooter className="mt-4 gap-2 sm:justify-end">
          <AdminButtonOutline size="sm" onClick={() => setEditPricing(null)}>
            {t('admin:products.cancel')}
          </AdminButtonOutline>
          <AdminButton size="sm" disabled={savingEdit} onClick={() => void handleSavePricingEdit()}>
            {t('admin:products.saveChanges')}
          </AdminButton>
        </DialogFooter>
      </AppModalShell>
    </>
  )
}

function CreateFormGrid({
  children,
  onSubmit,
  saving,
  submitLabel,
}: {
  children: ReactNode
  onSubmit: () => void
  saving: boolean
  submitLabel: string
}) {
  return (
    <div className="mb-3 rounded-lg border border-dashed border-border bg-muted/15 p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <div className="mt-3 flex justify-end">
        <AdminButton disabled={saving} onClick={onSubmit}>
          <Save className="size-4" />
          {saving ? '…' : submitLabel}
        </AdminButton>
      </div>
    </div>
  )
}
