import { expect, test } from '@playwright/test'

const APP_STATE_STORAGE_KEY = 'na-app-state'

test.describe('session restore', () => {
  test('root entry restores last path with lang and theme query', async ({ page }) => {
    const saved = {
      pathname: '/guide',
      search: '',
      hash: '',
      locale: 'en',
      theme: 'dark',
      updatedAt: Date.now(),
    }

    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [APP_STATE_STORAGE_KEY, JSON.stringify(saved)] as const,
    )

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/guide\?.*lang=en.*theme=dark/, { timeout: 15_000 })
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 15_000 })
  })

  test('syncs lang and theme into URL on navigation', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('novel-agent-locale', 'en')
      localStorage.setItem('na-theme', 'dark')
    })

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/lang=en/, { timeout: 15_000 })
    await page.waitForURL(/theme=dark/, { timeout: 15_000 })
  })
})
