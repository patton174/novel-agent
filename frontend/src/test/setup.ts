import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@/i18n'

/** jsdom 默认无 matchMedia；桌面断点 mock 供 useAppMobile / OrchestrationLayer 等使用 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

/** jsdom 默认无 ResizeObserver；recharts ResponsiveContainer 等组件需要它才能不抛错。
 *  configurable: true 以便个别测试用 vi.stubGlobal 覆盖自己的 mock（见 ThinkRoundGroup.test.tsx）。 */
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
})
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
})

afterEach(() => {
  cleanup()
})
