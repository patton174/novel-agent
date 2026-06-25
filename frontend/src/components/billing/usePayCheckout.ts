import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  payCheckout,
  payStart,
  type PayCheckoutResult,
} from '@/api/billingApi'
import { appToast } from '@/stores/appToastStore'

export function usePayCheckout(planCode: string | null, enabled: boolean) {
  const { t } = useTranslation(['dashboard'])
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [checkout, setCheckout] = useState<PayCheckoutResult | null>(null)
  const [method, setMethod] = useState('')

  const reset = useCallback(() => {
    setCheckout(null)
    setMethod('')
    setLoading(false)
    setPaying(false)
  }, [])

  useEffect(() => {
    if (!enabled || !planCode) {
      reset()
      return
    }
    let cancelled = false
    setLoading(true)
    void payCheckout(planCode)
      .then((data) => {
        if (cancelled) return
        setCheckout(data)
        setMethod(data.payments[0]?.method ?? 'alipay')
        if (data.status === 'DONE') {
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
  }, [enabled, planCode, reset, t])

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
