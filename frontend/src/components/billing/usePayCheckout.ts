import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  payCheckout,
  payStart,
  type PayCheckoutResult,
} from '@/api/billingApi'
import { readReferralCode } from '@/hooks/useReferralCapture'
import { appToast } from '@/stores/appToastStore'

export interface UsePayCheckoutOptions {
  planCode: string | null
  orderId?: string | null
  enabled: boolean
  reloadNonce?: number
  onCheckoutResolved?: (checkout: PayCheckoutResult) => void
}

function buildFetchKey(
  planCode: string | null,
  orderId?: string | null,
  couponCode?: string | null,
): string {
  return `${planCode ?? ''}|${orderId ?? ''}|${couponCode?.trim() ?? ''}`
}

type CheckoutCache = {
  fetchKey: string
  data: PayCheckoutResult
}

/** 跨组件实例 / Strict Mode 复用，避免并发重复 checkout */
const moduleCheckoutCache = new Map<string, PayCheckoutResult>()
const moduleInflight = new Map<string, Promise<PayCheckoutResult>>()

function rememberCheckout(data: PayCheckoutResult, couponCode?: string | null) {
  const stableKey = buildFetchKey(data.planCode, data.orderId, couponCode)
  moduleCheckoutCache.set(stableKey, data)
  moduleCheckoutCache.set(buildFetchKey(null, data.orderId, couponCode), data)
  if (data.planCode) {
    moduleCheckoutCache.set(buildFetchKey(data.planCode, null, couponCode), data)
  }
}

function readModuleCache(
  planCode: string | null,
  orderId?: string | null,
  couponCode?: string | null,
): PayCheckoutResult | null {
  const direct = moduleCheckoutCache.get(buildFetchKey(planCode, orderId, couponCode))
  if (direct) return direct
  if (orderId) {
    const byOrder = moduleCheckoutCache.get(buildFetchKey(null, orderId, couponCode))
    if (byOrder) return byOrder
  }
  if (planCode && !orderId) {
    const byPlan = moduleCheckoutCache.get(buildFetchKey(planCode, null, couponCode))
    if (byPlan) return byPlan
  }
  return null
}

export async function fetchCheckoutDeduped(params: {
  planCode?: string | null
  orderId?: string | null
  couponCode?: string | null
}): Promise<PayCheckoutResult> {
  const planCode = params.planCode?.trim() || null
  const orderId = params.orderId?.trim() || null
  const couponCode = params.couponCode?.trim() || null
  const key = buildFetchKey(planCode, orderId, couponCode)

  const cached = readModuleCache(planCode, orderId, couponCode)
  if (cached) return cached

  const inflight = moduleInflight.get(key)
  if (inflight) return inflight

  const affCode = readReferralCode() || undefined
  const promise = payCheckout({
    planCode: planCode ?? undefined,
    orderId: orderId ?? undefined,
    couponCode: couponCode ?? undefined,
    affCode,
  })
    .then((data) => {
      rememberCheckout(data, couponCode)
      return data
    })
    .finally(() => {
      moduleInflight.delete(key)
    })

  moduleInflight.set(key, promise)
  return promise
}

function readCache(
  cache: CheckoutCache | null,
  planCode: string | null,
  orderId: string | null | undefined,
  couponCode?: string | null,
): PayCheckoutResult | null {
  if (cache) {
    const fetchKey = buildFetchKey(planCode, orderId, couponCode)
    if (cache.fetchKey === fetchKey) return cache.data
    if (orderId && cache.data.orderId === orderId) return cache.data
    if (planCode && !orderId && cache.data.planCode === planCode) return cache.data
  }
  return readModuleCache(planCode, orderId, couponCode ?? null)
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
  const [couponCode, setCouponCode] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState('')
  const [applyNonce, setApplyNonce] = useState(0)

  const onResolvedRef = useRef(onCheckoutResolved)
  onResolvedRef.current = onCheckoutResolved

  const cacheRef = useRef<CheckoutCache | null>(null)
  const toastOrderRef = useRef<string | null>(null)
  const resolvedOrderRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    setCheckout(null)
    setMethod('')
    setCouponCode('')
    setAppliedCouponCode('')
    setApplyNonce(0)
    setLoading(false)
    setPaying(false)
    cacheRef.current = null
    toastOrderRef.current = null
    resolvedOrderRef.current = null
  }, [])

  useEffect(() => {
    if (!enabled || (!planCode && !orderId)) {
      reset()
      return
    }

    const activeCoupon = appliedCouponCode.trim() || null
    const cached = readCache(cacheRef.current, planCode, orderId, activeCoupon)
    if (cached && reloadNonce === 0 && applyNonce === 0) {
      setCheckout(cached)
      setMethod(cached.payments[0]?.method ?? 'alipay')
      setLoading(false)
      if (resolvedOrderRef.current !== cached.orderId) {
        resolvedOrderRef.current = cached.orderId
        onResolvedRef.current?.(cached)
      }
      return
    }

    if (reloadNonce > 0 || applyNonce > 0) {
      cacheRef.current = null
      if (orderId) moduleCheckoutCache.delete(buildFetchKey(null, orderId, activeCoupon))
      if (planCode) moduleCheckoutCache.delete(buildFetchKey(planCode, null, activeCoupon))
      moduleCheckoutCache.delete(buildFetchKey(planCode, orderId, activeCoupon))
    }

    let cancelled = false
    setLoading(true)

    void fetchCheckoutDeduped({ planCode, orderId, couponCode: activeCoupon ?? undefined })
      .then((data) => {
        if (cancelled) return
        const stableKey = buildFetchKey(data.planCode, data.orderId, activeCoupon)
        cacheRef.current = { fetchKey: stableKey, data }
        setCheckout(data)
        setMethod(data.payments[0]?.method ?? 'alipay')
        if (resolvedOrderRef.current !== data.orderId) {
          resolvedOrderRef.current = data.orderId
          onResolvedRef.current?.(data)
        }
        if (data.status === 'DONE' && toastOrderRef.current !== data.orderId) {
          toastOrderRef.current = data.orderId
          appToast.success(t('dashboard:billing.paySuccess'))
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
  }, [enabled, planCode, orderId, reloadNonce, applyNonce, appliedCouponCode, reset, t])

  const applyCoupon = useCallback(() => {
    setAppliedCouponCode(couponCode.trim())
    setApplyNonce((n) => n + 1)
  }, [couponCode])

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
    couponCode,
    setCouponCode,
    applyCoupon,
    handlePay,
    reset,
  }
}

export function formatPayPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return '—'
  const symbol = currency === 'CNY' || !currency ? '¥' : `${currency} `
  return `${symbol}${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

/** @internal test helper */
export function __clearPayCheckoutCacheForTests() {
  moduleCheckoutCache.clear()
  moduleInflight.clear()
}
