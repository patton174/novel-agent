import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import {
  fetchIdrSkuDetail,
  updateIdrSkuInventory,
  type IdrSkuDetail,
} from '@/api/idrAdminApi'
import {
  AdminButton,
  AdminButtonOutline,
  AdminField,
  AdminFormActions,
  AdminSelect,
  AdminTextInput,
} from '@/components/admin/AdminFormControls'
import { PixelBadge, PixelCellMono, PIXEL_PANEL_SOFT } from '@/components/pixel'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
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
    >
      {loading || !detail ? (
        <Skeleton className="h-40 w-full rounded-xl border border-border/60" />
      ) : (
        <div className="space-y-4 text-sm">
          <div className={cn('flex flex-wrap gap-3', PIXEL_PANEL_SOFT)}>
            <span className="font-mono text-xs">
              {t('admin:products.inventoryCurrent')}:{' '}
              <PixelCellMono className="inline font-bold">{stockCount}</PixelCellMono>
            </span>
            <span className="font-mono text-xs">
              {t('admin:products.colSold')}:{' '}
              <PixelCellMono className="inline font-bold">{detail.sold ?? 0}</PixelCellMono>
            </span>
            <PixelBadge tone={detail.status === 'ONLINE' ? 'success' : 'muted'}>
              {detail.status ?? '—'}
            </PixelBadge>
          </div>

          <p className="font-mono text-xs text-muted-foreground">{t('admin:products.inventoryAutoCdkHint')}</p>

          <AdminField layout="form" label={t('admin:products.inventoryAddQuantity')} hint={t('admin:products.inventoryQuantityHint')}>
            <AdminTextInput
              type="number"
              min={1}
              max={500}
              placeholder={t('admin:products.placeholderQuantity')}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </AdminField>

          <AdminField layout="form" label={t('admin:products.inventoryStatus')}>
            <AdminSelect value={status} onChange={(e) => setStatus(e.target.value as 'ONLINE' | 'OFFLINE')}>
              <option value="ONLINE">{t('admin:products.statusOnline')}</option>
              <option value="OFFLINE">{t('admin:products.statusOffline')}</option>
            </AdminSelect>
          </AdminField>
        </div>
      )}

      <AdminFormActions bordered className="mt-4">
        <AdminButtonOutline size="sm" onClick={onClose}>
          {t('admin:plans.cancel')}
        </AdminButtonOutline>
        <AdminButton size="sm" disabled={saving || loading} onClick={() => void handleSave()}>
          <Save className="size-3.5" />
          {saving ? t('admin:products.saving') : t('admin:products.inventorySave')}
        </AdminButton>
      </AdminFormActions>
    </AppModalShell>
  )
}
