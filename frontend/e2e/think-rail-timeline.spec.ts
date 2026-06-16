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

  test('indents tool rows relative to think headline column', async ({ page }) => {
    const thinkLead = page.locator('[data-think-lead-id="fixture-think-1"]')
    const toolRow = page.getByTestId('timeline-orchestration-tool').first()
    const toolIcon = page.getByTestId('fixture-tool-fixture-tool-1').getByTestId('timeline-lead-icon')

    const thinkLeadBox = await thinkLead.boundingBox()
    const toolIconBox = await toolIcon.boundingBox()
    const paddingLeft = await toolRow.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).paddingLeft),
    )
    expect(paddingLeft).toBeGreaterThan(24)
    expect(thinkLeadBox).not.toBeNull()
    expect(toolIconBox).not.toBeNull()
    expect(toolIconBox!.x).toBeGreaterThan(thinkLeadBox!.x + thinkLeadBox!.width + 4)
  })

  test('aligns tool icon with tool title within tolerance', async ({ page }) => {
    const toolRows = page.locator('[data-timeline-tool-headline-row]')
    const count = await toolRows.count()
    for (let i = 0; i < count; i += 1) {
      const row = toolRows.nth(i)
      const icon = row.locator('[data-timeline-tool-lead] [data-testid="timeline-lead-icon"]')
      const title = row.locator('.font-semibold').first()
      const iconBox = await icon.boundingBox()
      const titleBox = await title.boundingBox()
      expect(iconBox).not.toBeNull()
      expect(titleBox).not.toBeNull()
      const iconCenter = iconBox!.y + iconBox!.height / 2
      const titleCenter = titleBox!.y + titleBox!.height / 2
      expect(Math.abs(iconCenter - titleCenter)).toBeLessThan(3)
    }
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
      expect(Math.abs(leadCenter - labelCenter)).toBeLessThan(3)
    }
  })
})
