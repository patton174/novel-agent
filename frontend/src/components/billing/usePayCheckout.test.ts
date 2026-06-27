import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  __clearPayCheckoutCacheForTests,
  fetchCheckoutDeduped,
} from './usePayCheckout'

const payCheckoutMock = vi.fn()

vi.mock('@/api/billingApi', () => ({
  payCheckout: (...args: unknown[]) => payCheckoutMock(...args),
  payStart: vi.fn(),
}))

describe('fetchCheckoutDeduped', () => {
  beforeEach(() => {
    __clearPayCheckoutCacheForTests()
    payCheckoutMock.mockReset()
  })

  it('dedupes concurrent checkout calls with the same key', async () => {
    let resolve!: (value: unknown) => void
    payCheckoutMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )

    const p1 = fetchCheckoutDeduped({ planCode: 'pro' })
    const p2 = fetchCheckoutDeduped({ planCode: 'pro' })

    expect(payCheckoutMock).toHaveBeenCalledTimes(1)

    resolve({
      orderId: 'order-1',
      planCode: 'pro',
      planName: 'Pro',
      status: 'NEW',
      amountCents: 9900,
      currency: 'CNY',
      payments: [{ method: 'alipay', name: 'alipay', desc: '', platform: true }],
      localOrderId: 1,
    })

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1.orderId).toBe('order-1')
    expect(r2.orderId).toBe('order-1')
  })

  it('reuses module cache across equivalent plan/order keys', async () => {
    payCheckoutMock.mockResolvedValue({
      orderId: 'order-1',
      planCode: 'pro',
      planName: 'Pro',
      status: 'NEW',
      amountCents: 9900,
      currency: 'CNY',
      payments: [],
      localOrderId: 1,
    })

    await fetchCheckoutDeduped({ planCode: 'pro' })
    await fetchCheckoutDeduped({ planCode: 'pro', orderId: 'order-1' })

    expect(payCheckoutMock).toHaveBeenCalledTimes(1)
  })

  it('passes couponCode and affCode from referral cookie', async () => {
    document.cookie = 'na-ref=TEST; path=/'
    payCheckoutMock.mockResolvedValue({
      orderId: 'order-1',
      planCode: 'pro',
      planName: 'Pro',
      status: 'NEW',
      amountCents: 9900,
      currency: 'CNY',
      payments: [],
      localOrderId: 1,
    })

    await fetchCheckoutDeduped({ planCode: 'pro', couponCode: 'SAVE10' })

    expect(payCheckoutMock).toHaveBeenCalledWith({
      planCode: 'pro',
      couponCode: 'SAVE10',
      affCode: 'TEST',
    })
    document.cookie = 'na-ref=; Max-Age=0; path=/'
  })

  it('fetches a new checkout when coupon code changes (apply coupon)', async () => {
    payCheckoutMock.mockResolvedValueOnce({
      orderId: 'order-no-coupon',
      planCode: 'pro',
      planName: 'Pro',
      status: 'NEW',
      amountCents: 9900,
      currency: 'CNY',
      payments: [],
      localOrderId: 1,
    })
    payCheckoutMock.mockResolvedValueOnce({
      orderId: 'order-with-coupon',
      planCode: 'pro',
      planName: 'Pro',
      status: 'NEW',
      amountCents: 8900,
      currency: 'CNY',
      payments: [],
      localOrderId: 2,
    })

    await fetchCheckoutDeduped({ planCode: 'pro' })
    await fetchCheckoutDeduped({ planCode: 'pro', couponCode: 'SAVE10' })

    expect(payCheckoutMock).toHaveBeenCalledTimes(2)
    expect(payCheckoutMock).toHaveBeenNthCalledWith(1, { planCode: 'pro' })
    expect(payCheckoutMock).toHaveBeenNthCalledWith(2, {
      planCode: 'pro',
      couponCode: 'SAVE10',
    })
  })
})
