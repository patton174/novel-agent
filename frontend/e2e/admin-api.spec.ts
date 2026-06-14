import { expect, test, type Page } from '@playwright/test'

const PROD_URL = process.env.NOVEL_AGENT_E2E_URL ?? 'https://www.novel-agent.cn'
const ADMIN_USER = process.env.NOVEL_AGENT_E2E_ADMIN_USER
const ADMIN_PASS = process.env.NOVEL_AGENT_E2E_ADMIN_PASSWORD

const ADMIN_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/stats',
  '/admin/plans',
  '/admin/revenue',
  '/admin/audit-log',
  '/admin/site-content',
  '/admin/settings',
  '/admin/crawler',
  '/admin/catalog',
] as const

function isAdminApi(url: string): boolean {
  try {
    const { pathname } = new URL(url)
    return (
      pathname.includes('/crm/') ||
      pathname.includes('/api/auth/crm/') ||
      pathname.includes('/api/content/crm/') ||
      pathname.includes('/api/billing/crm/')
    )
  } catch {
    return false
  }
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${PROD_URL}/login?returnTo=${encodeURIComponent('/admin')}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  })
  await page.getByLabel(/用户名|Username/i).fill(ADMIN_USER!)
  await page.getByLabel(/密码|Password/i).fill(ADMIN_PASS!)
  await page.getByRole('button', { name: /登录|Sign in|Log in/i }).click()
  await page.waitForURL(/\/admin(?:\/|$|\?)/, { timeout: 30_000 })
}

test.describe('admin CRM APIs', () => {
  test.skip(!ADMIN_USER || !ADMIN_PASS, '需要 NOVEL_AGENT_E2E_ADMIN_USER / NOVEL_AGENT_E2E_ADMIN_PASSWORD')

  test('各管理页 CRM API 应返回 2xx', async ({ page }) => {
    const failures: string[] = []

    page.on('response', (response) => {
      const url = response.url()
      if (!isAdminApi(url)) {
        return
      }
      const status = response.status()
      if (status >= 400) {
        failures.push(`${status} ${response.request().method()} ${url}`)
      }
    })

    await loginAsAdmin(page)

    for (const route of ADMIN_ROUTES) {
      failures.length = 0
      await page.goto(`${PROD_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })
      await page.waitForTimeout(route === '/admin/crawler' ? 5_000 : 2_500)
      expect(failures, `${route}:\n${failures.join('\n')}`).toEqual([])
    }
  })

  test('套餐更新后 GET 应返回最新数据', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${PROD_URL}/admin/plans`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForTimeout(2_000)

    const editBtn = page.getByRole('button', { name: /编辑|Edit/i }).first()
    const hasPlan = await editBtn.isVisible().catch(() => false)
    test.skip(!hasPlan, '无可用套餐行')

    let plansBefore: Array<{ id: number; sortOrder: number }> = []
    const listRes = await page.waitForResponse(
      (res) => res.url().includes('/api/billing/crm/plans') && res.request().method() === 'GET',
      { timeout: 15_000 },
    )
    const listJson = await listRes.json()
    plansBefore = Array.isArray(listJson?.data) ? listJson.data : []

    await editBtn.click()
    const sortInput = page.locator('input[type="number"]').last()
    const currentSort = Number(await sortInput.inputValue())
    const nextSort = currentSort === 99 ? 98 : 99
    await sortInput.fill(String(nextSort))
    await page.getByRole('button', { name: /保存|Save/i }).click()
    await page.waitForTimeout(1_500)

    const reloadRes = await page.waitForResponse(
      (res) => res.url().includes('/api/billing/crm/plans') && res.request().method() === 'GET',
      { timeout: 15_000 },
    )
    expect(reloadRes.ok()).toBeTruthy()
    const reloadJson = await reloadRes.json()
    const plansAfter: Array<{ id: number; sortOrder: number }> = Array.isArray(reloadJson?.data)
      ? reloadJson.data
      : []
    const editedId = plansBefore[0]?.id
    const updated = plansAfter.find((p) => p.id === editedId)
    expect(updated?.sortOrder, JSON.stringify({ before: plansBefore[0], after: updated })).toBe(nextSort)

    // 还原 sortOrder，避免污染线上数据
    await page.getByRole('button', { name: /编辑|Edit/i }).first().click()
    await sortInput.fill(String(currentSort))
    await page.getByRole('button', { name: /保存|Save/i }).click()
  })

  test('爬虫页 5 秒内 CRM 请求不应超过 12 次', async ({ page }) => {
    let adminApiCount = 0

    page.on('request', (request) => {
      if (isAdminApi(request.url())) {
        adminApiCount += 1
      }
    })

    await loginAsAdmin(page)
    adminApiCount = 0
    await page.goto(`${PROD_URL}/admin/crawler`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForTimeout(5_000)

    expect(adminApiCount, `5s 内 ${adminApiCount} 次 CRM 请求`).toBeLessThanOrEqual(12)
  })
})
