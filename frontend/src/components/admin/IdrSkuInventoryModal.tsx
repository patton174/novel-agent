import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Save } from 'lucide-react'
import {
  fetchIdrSkuDetail,
  updateIdrSkuInventory,
  type IdrSkuDetail,
} from '@/api/idrAdminApi'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'

interface IdrSkuInventoryModalProps {
  skuId: string | null
  skuName?: string | null
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function IdrSkuInventoryModal({
  skuId,
  skuName,
  open,
  onClose,
  onSaved,
}: IdrSkuInventoryModalProps) {
  const { t } = useTranslation(['admin'])
  const [detail, setDetail] = useState<IdrSkuDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE')
  const [quantity, setQuantity] = useState('')

  const load = useCallback(async () => {
    if (!skuId?.trim()) return
    setLoading(true)
    try {
      const data = await fetchIdrSkuDetail(skuId)
      setDetail(data)
      setStatus(data.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE')
      setQuantity('')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.inventoryLoadFail'))
      onClose()
    } finally {
      setLoading(false)
    }
  }, [onClose, skuId, t])

  useEffect(() => {
    if (open && skuId) {
      void load()
    } else if (!open) {
      setDetail(null)
    }
  }, [load, open, skuId])

  const handleSave = async () => {
    if (!skuId) return
    const qty = Number.parseInt(quantity.trim(), 10)
    const statusChanged = detail && status !== (detail.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE')
    if ((!Number.isFinite(qty) || qty <= 0) && !statusChanged) {
      appToast.error(t('admin:products.inventoryNeedQuantity'))
      return
    }
    setSaving(true)
    try {
      await updateIdrSkuInventory(skuId, {
        quantity: Number.isFinite(qty) && qty > 0 ? qty : undefined,
        status: statusChanged ? status : undefined,
      })
      appToast.success(
        Number.isFinite(qty) && qty > 0
          ? t('admin:products.inventoryAdded', { count: qty })
          : t('admin:products.inventorySaveSuccess'),
      )
      onSaved?.()
      onClose()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:products.inventorySaveFail'))
    } finally {
      setSaving(false)
    }
  }

  const stockCount = detail?.stock ?? detail?.itemsNum ?? 0

  return (
    <AppModalShell
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={t('admin:products.inventoryTitle')}
      description={skuName ?? skuId ?? ''}
      icon={<Package className="size-5" />}
    >
      {loading || !detail ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <span>
              {t('admin:products.inventoryCurrent')}: <strong className="tabular-nums">{stockCount}</strong>
            </span>
            <span>
              {t('admin:products.colSold')}: <strong className="tabular-nums">{detail.sold ?? 0}</strong>
            </span>
            <span>
              {t('admin:products.colStatus')}: <strong>{detail.status ?? '—'}</strong>
            </span>
          </div>

          <p className="text-xs text-muted-foreground">{t('admin:products.inventoryAutoCdkHint')}</p>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium">{t('admin:products.inventoryAddQuantity')}</span>
            <Input
              type="number"
              min={1}
              max={500}
              placeholder="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-9"
            />
            <span className="text-[11px] text-muted-foreground">{t('admin:products.inventoryQuantityHint')}</span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium">{t('admin:products.inventoryStatus')}</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ONLINE' | 'OFFLINE')}
            >
              <option value="ONLINE">ONLINE</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
          </label>
        </div>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('admin:plans.cancel')}
        </Button>
        <Button type="button" size="sm" disabled={saving || loading} onClick={() => void handleSave()}>
          <Save className="size-3.5" />
          {saving ? t('admin:products.saving') : t('admin:products.inventorySave')}
        </Button>
      </DialogFooter>
    </AppModalShell>
  )
}
