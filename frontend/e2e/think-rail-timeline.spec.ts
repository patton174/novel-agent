import { expect, test } from '@playwright/test'

test.describe('think rail timeline fixture', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/dev/think-rail-fixture', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('think-rail-fixture')).toBeVisible()
    await expect(page.getByTestId('agent-think-toggle').first()).toBeVisible()
  })

  test('draws bounded segments between think icons only', async ({ page }) => {
    const segments = page.getByTestId('think-rail-segment')
    await expect(segments).toHaveCount(2, { timeout: 10000 })

    const leads = page.locator('[data-think-lead-id]')
    await expect(leads).toHaveCount(3)

    const lastLead = leads.last()
    const lastLeadBox = await lastLead.boundingBox()
    expect(lastLeadBox).not.toBeNull()

    const segmentCount = await segments.count()
    for (let i = 0; i < segmentCount; i += 1) {
      const segBox = await segments.nth(i).boundingBox()
      expect(segBox).not.toBeNull()
      expect(segBox!.y + segBox!.height).toBeLessThanOrEqual(lastLeadBox!.y + 4)
    }
  })

  test('keeps tool rows indented under think title column', async ({ page }) => {
    const toolRow = page.getByTestId('timeline-orchestration-tool').first()
    const thinkToggle = page
      .locator('[data-think-lead-id="fixture-think-1"]')
      .locator('..')
      .getByTestId('agent-think-toggle')

    const paddingLeft = await toolRow.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).paddingLeft),
    )
    expect(paddingLeft).toBeGreaterThan(24)

    const toolHeadlineRow = page.getByTestId('fixture-tool-fixture-tool-1').locator('> div').first()
    const toolRowBox = await toolHeadlineRow.boundingBox()
    const toggleBox = await thinkToggle.boundingBox()
    expect(toolRowBox).not.toBeNull()
    expect(toggleBox).not.toBeNull()
    expect(Math.abs(toolRowBox!.x - toggleBox!.x)).toBeLessThan(6)
  })

  test('aligns think icon with first headline line within tolerance', async ({ page }) => {
    const toggles = page.getByTestId('agent-think-toggle')
    await expect(toggles.first()).toBeVisible()

    const count = await toggles.count()
    for (let i = 0; i < count; i += 1) {
      const toggle = toggles.nth(i)
      const lead = page.locator('[data-think-lead-id]').nth(i)
      const label = toggle.locator('.font-semibold').first()
      const labelBox = await label.boundingBox()
      const leadBox = await lead.boundingBox()
      expect(labelBox).not.toBeNull()
      expect(leadBox).not.toBeNull()

      const leadCenter = leadBox!.y + leadBox!.height / 2
      const labelCenter = labelBox!.y + labelBox!.height / 2
      expect(Math.abs(leadCenter - labelCenter)).toBeLessThan(5)
    }
  })
})
