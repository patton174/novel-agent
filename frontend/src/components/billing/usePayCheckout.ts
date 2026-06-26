import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  payCheckout,
  payStart,
  type PayCheckoutResult,
} from '@/api/billingApi'
import { appToast } from '@/stores/appToastStore'

export interface UsePayCheckoutOptions {
  planCode: string | null
  orderId?: string | null
  enabled: boolean
  reloadNonce?: number
  onCheckoutResolved?: (checkout: PayCheckoutResult) => void
}

function buildFetchKey(planCode: string | null, orderId?: string | null): string {
  return `${planCode ?? ''}|${orderId ?? ''}`
}

type CheckoutCache = {
  fetchKey: string
  data: PayCheckoutResult
}

function readCache(
  cache: CheckoutCache | null,
  planCode: string | null,
  orderId: string | null | undefined,
): PayCheckoutResult | null {
  if (!cache) return null
  const fetchKey = buildFetchKey(planCode, orderId)
  if (cache.fetchKey === fetchKey) return cache.data
  if (orderId && cache.data.orderId === orderId) return cache.data
  if (planCode && !orderId && cache.data.planCode === planCode) return cache.data
  return null
}

export function usePayCheckout({
  planCode,
  orderId,
  enabled,
  reloadNonce = 0,
  onCheckoutResolved,
}: UsePayCheckoutOptions) {
  const { t } = useTranslation(['dashboard'])
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [checkout, setCheckout] = useState<PayCheckoutResult | null>(null)
  const [method, setMethod] = useState('')

  const onResolvedRef = useRef(onCheckoutResolved)
  onResolvedRef.current = onCheckoutResolved

  const cacheRef = useRef<CheckoutCache | null>(null)
  const toastOrderRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    setCheckout(null)
    setMethod('')
    setLoading(false)
    setPaying(false)
    cacheRef.current = null
    toastOrderRef.current = null
  }, [])

  useEffect(() => {
    if (!enabled || (!planCode && !orderId)) {
      reset()
      return
    }

    const cached = readCache(cacheRef.current, planCode, orderId)
    if (cached && reloadNonce === 0) {
      setCheckout(cached)
      setMethod(cached.payments[0]?.method ?? 'alipay')
      setLoading(false)
      return
    }

    if (reloadNonce > 0) {
      cacheRef.current = null
    }

    let cancelled = false
    setLoading(true)

    void payCheckout({
      planCode: planCode ?? undefined,
      orderId: orderId ?? undefined,
    })
      .then((data) => {
        if (cancelled) return
        const stableKey = buildFetchKey(data.planCode, data.orderId)
        cacheRef.current = { fetchKey: stableKey, data }
        setCheckout(data)
        setMethod(data.payments[0]?.method ?? 'alipay')
        onResolvedRef.current?.(data)
        if (data.status === 'DONE' && toastOrderRef.current !== data.orderId) {
          toastOrderRef.current = data.orderId
          appToast.success(t('dashboard:billing.paySuccess'))
        } else if (data.resumed && toastOrderRef.current !== data.orderId) {
          toastOrderRef.current = data.orderId
          appToast.info(t('dashboard:billing.payResumedPending'))
        }
      })
      .catch((e) => {
        if (cancelled) return
        appToast.error(e instanceof Error ? e.message : t('dashboard:billing.payFail'))
        setCheckout(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, planCode, orderId, reloadNonce, reset, t])

  const handlePay = async () => {
    if (!checkout?.orderId || !method) return
    setPaying(true)
    try {
      const result = await payStart(checkout.orderId, method)
      if (result.payUrl) {
        window.location.href = result.payUrl
        return
      }
      appToast.success(t('dashboard:billing.paySuccess'))
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('dashboard:billing.payFail'))
    } finally {
      setPaying(false)
    }
  }

  return {
    loading,
    paying,
    checkout,
    method,
    setMethod,
    handlePay,
    reset,
  }
}

export function formatPayPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return '—'
  const symbol = currency === 'CNY' || !currency ? '¥' : `${currency} `
  return `${symbol}${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}
