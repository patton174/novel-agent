import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIsDesktop } from './useIsDesktop'

describe('useIsDesktop', () => {
  it('returns true when matchMedia says desktop (matches:false for mobile query)', () => {
    // setup.ts 默认 mock matchMedia 返回 matches:false，即「非移动」= 桌面
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it('returns false when matchMedia matches mobile query', () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: q.includes('max-width'),
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
    window.matchMedia = original
  })
})
