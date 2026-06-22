import { expect, test } from '@playwright/test'

const PROD_URL = process.env.NOVEL_AGENT_E2E_URL ?? 'https://www.novel-agent.cn'

function isProtectedRequest(url: string): boolean {
  if (url.includes('/api/auth/crypto-config')) {
    return false
  }
  if (/\.(js|css|png|jpe?g|svg|webp|woff2?|ico|map)(\?|$)/i.test(url)) {
    return false
  }
  try {
    const { pathname } = new URL(url)
    return pathname.startsWith('/api/') || /^\/g\/[^/]+\//.test(pathname)
  } catch {
    return false
  }
}

test.describe('request sign chain', () => {
  test('marketing homepage API calls are signed and never return request sign required', async ({ page }) => {
    const signRequiredResponses: Array<{ url: string; body: string }> = []
    const unsignedApiRequests: string[] = []

    page.on('response', async (response) => {
      const url = response.url()
      if (!isProtectedRequest(url)) {
        return
      }
      if (response.status() !== 400) {
        return
      }
      const body = await response.text().catch(() => '')
      if (body.includes('request sign required') || body.includes('sign required')) {
        signRequiredResponses.push({ url, body })
      }
    })

    page.on('request', (request) => {
      const url = request.url()
      if (!isProtectedRequest(url)) {
        return
      }
      const method = request.method()
      const needsQuerySign = method === 'GET' || method === 'DELETE' || method === 'HEAD'
      if (needsQuerySign && !url.includes('_na_s=')) {
        unsignedApiRequests.push(`${method} ${url}`)
      }
    })

    await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 45_000 }).catch(async () => {
      await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(8_000)
    })

    expect(signRequiredResponses, JSON.stringify(signRequiredResponses, null, 2)).toEqual([])
    expect(unsignedApiRequests, unsignedApiRequests.join('\n')).toEqual([])
  })
})
