import { Link } from 'react-router-dom'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { ChevronDown, ChevronRight, Package, Plus, RefreshCw, Ticket, Tags } from 'lucide-react'

import {

  fetchIdrProjectDetail,

  resolveSkuStockCount,

  type IdrProjectDetail,

  type IdrSkuItem,

} from '@/api/idrAdminApi'

import { AdminButtonGhost, AdminButtonIcon } from '@/components/admin/AdminFormControls'
import { TableActionButton } from '@/components/shared/TableActions'

import { IdrSkuInventoryModal } from '@/components/admin/IdrSkuInventoryModal'

import { Skeleton } from '@/components/ui/skeleton'

import { cn } from '@/lib/utils'



const LOW_STOCK_THRESHOLD = 5



interface IdrCatalogPanelProps {

  projectId: string | null | undefined

}



export function IdrCatalogPanel({ projectId }: IdrCatalogPanelProps) {

  const { t } = useTranslation(['admin'])

  const [detail, setDetail] = useState<IdrProjectDetail | null>(null)

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [inventorySku, setInventorySku] = useState<IdrSkuItem | null>(null)

  const [showPricing, setShowPricing] = useState(false)

  const [showCoupons, setShowCoupons] = useState(false)



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

    return { skuCount: skus.length, totalStock, lowStock }

  }, [detail?.skus])



  if (!projectId?.trim()) {

    return (

      <p className="py-6 text-center text-xs text-muted-foreground">

        {t('admin:products.catalogSelectProjectHint')}

      </p>

    )

  }



  if (loading) {

    return <Skeleton className="h-32 w-full rounded-lg" />

  }



  if (error) {

    return (

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-xs text-destructive">

        {error}

      </div>

    )

  }



  if (!detail) {

    return null

  }



  return (

    <>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold">{detail.project.name}</p>

          <p className="truncate text-xs text-muted-foreground">
            {detail.project.status ?? '—'}
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">

            <span className="rounded-lg bg-muted px-2 py-1">

              SKU {stats.skuCount}

            </span>

            <span className="rounded-lg bg-muted px-2 py-1">

              {t('admin:products.statTotalStock')} {stats.totalStock}

            </span>

            {stats.lowStock > 0 ? (

              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">

                {t('admin:products.statLowStock')} {stats.lowStock}

              </span>

            ) : null}

          </div>

          <AdminButtonIcon onClick={() => void loadDetail()} aria-label={t('admin:products.catalogRefresh')}>
            <RefreshCw className="size-4" />
          </AdminButtonIcon>

          <AdminButtonGhost asChild>
            <Link to="/admin/payment-orders?status=DONE">{t('admin:products.viewRedemptions')}</Link>
          </AdminButtonGhost>

        </div>

      </div>



      {detail.skus.length === 0 ? (

        <p className="py-4 text-xs text-muted-foreground">{t('admin:products.noSkus')}</p>

      ) : (

        <div className="overflow-x-auto rounded-lg border border-border">

          <table className="w-full min-w-[640px] text-left text-xs">

            <thead className="border-b border-border bg-muted/40 text-muted-foreground">

              <tr>

                <th className="px-3 py-2 font-medium">{t('admin:products.colSkuName')}</th>

                <th className="px-3 py-2 font-medium">{t('admin:products.colStatus')}</th>

                <th className="px-3 py-2 font-medium tabular-nums">{t('admin:products.colStock')}</th>

                <th className="px-3 py-2 font-medium tabular-nums">{t('admin:products.colSold')}</th>

                <th className="px-3 py-2 font-medium">{t('admin:products.colActions')}</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-border">

              {detail.skus.map((sku) => (

                <SkuRow key={sku.id} sku={sku} onAddStock={() => setInventorySku(sku)} t={t} />

              ))}

            </tbody>

          </table>

        </div>

      )}



      <CollapsibleSection

        title={t('admin:products.catalogPricings')}

        icon={Tags}

        open={showPricing}

        onToggle={() => setShowPricing((v) => !v)}

        empty={t('admin:products.catalogEmpty')}

        rows={detail.pricings.map((p) => `${p.policy ?? '—'} · ${p.scope ?? '—'} · ${p.price != null ? `$${p.price}` : '—'} · ${p.status ?? '—'}`)}

      />

      <CollapsibleSection

        title={t('admin:products.catalogCoupons')}

        icon={Ticket}

        open={showCoupons}

        onToggle={() => setShowCoupons((v) => !v)}

        empty={t('admin:products.catalogEmpty')}

        rows={detail.coupons.map((c) => `${c.code ?? '—'} · ${c.policy ?? '—'} · ${c.status ?? '—'}`)}

      />



      <IdrSkuInventoryModal

        open={inventorySku != null}

        skuId={inventorySku?.id ?? null}

        skuName={inventorySku?.name}

        onClose={() => setInventorySku(null)}

        onSaved={() => void loadDetail()}

      />

    </>

  )

}



function SkuRow({

  sku,

  onAddStock,

  t,

}: {

  sku: IdrSkuItem

  onAddStock: () => void

  t: (key: string) => string

}) {

  const stock = resolveSkuStockCount(sku)

  const low = stock != null && stock <= LOW_STOCK_THRESHOLD

  const online = sku.status === 'ONLINE'



  return (

    <tr className="hover:bg-muted/20">

      <td className="px-3 py-2">
        <p className="font-medium">{sku.name}</p>
      </td>

      <td className="px-3 py-2">

        <span

          className={cn(

            'rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase',

            online ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground',

          )}

        >

          {sku.status ?? '—'}

        </span>

      </td>

      <td className={cn('px-3 py-2 tabular-nums font-semibold', low && 'text-amber-700')}>

        {stock ?? '—'}

      </td>

      <td className="px-3 py-2 tabular-nums">{sku.sold ?? 0}</td>

      <td className="px-3 py-2">

        <TableActionButton variant="outline" onClick={onAddStock}>
          <Plus className="size-4" />
          {t('admin:products.inventoryAddStock')}
        </TableActionButton>

      </td>

    </tr>

  )

}



function CollapsibleSection({

  title,

  icon: Icon,

  open,

  onToggle,

  empty,

  rows,

}: {

  title: string

  icon: typeof Package

  open: boolean

  onToggle: () => void

  empty: string

  rows: string[]

}) {

  return (

    <section className="mt-4 border-t border-border pt-2">

      <button

        type="button"

        className="flex w-full items-center gap-1.5 py-1 text-left text-xs"

        onClick={onToggle}

      >

        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}

        <Icon className="size-3.5 text-muted-foreground" />

        <span className="font-medium text-muted-foreground">{title}</span>

        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{rows.length}</span>

      </button>

      {open ? (

        <div className="mt-1 space-y-1 pl-5">

          {rows.length === 0 ? (

            <p className="text-xs text-muted-foreground">{empty}</p>

          ) : (

            rows.map((row, idx) => (

              <p key={idx} className="rounded border border-border/60 bg-muted/20 px-2 py-1 font-mono text-[10px]">

                {row}

              </p>

            ))

          )}

        </div>

      ) : null}

    </section>

  )

}

