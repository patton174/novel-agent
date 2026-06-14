import { expect, test } from '@playwright/test'

test.describe('dark theme marketing', () => {
  test('story copy stays readable in dark mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?theme=dark&lang=zh', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.locator('#story-context').scrollIntoViewIfNeeded()
    const title = page.locator('#story-context .story-copy-block h3')
    const bullet = page.locator('#story-context .story-copy-block li').first()
    await expect(title).toBeVisible()
    await expect(bullet).toBeVisible()

    await expect(title).not.toHaveCSS('color', 'rgb(15, 23, 42)')
    await expect(bullet).not.toHaveCSS('color', 'rgb(15, 23, 42)')

    const bulletClass = await bullet.getAttribute('class')
    expect(bulletClass).toContain('text-foreground')
  })

  test('html root has dark class when theme=dark', async ({ page }) => {
    await page.goto('/?theme=dark', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
