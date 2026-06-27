/**
 * 部署后通知搜索引擎拉取 sitemap（Google 需先在 Search Console 手动添加一次 sitemap）。
 *
 * 环境变量：
 *   SEO_SITE_ORIGIN / VITE_SITE_ORIGIN  默认 https://www.novel-agent.cn
 *   BAIDU_SITE_TOKEN                    百度站长「链接提交」token（zz.baidu.com）
 *   BING_WEBMASTER_API_KEY              可选；Bing Webmaster API key
 *   INDEXNOW_KEY                        可选；IndexNow key（需在站点根目录托管 {key}.txt）
 *
 * 用法：
 *   node scripts/ping-search-engines.mjs
 *   BAIDU_SITE_TOKEN=xxx node scripts/ping-search-engines.mjs
 */
const SITE_ORIGIN = (process.env.SEO_SITE_ORIGIN || process.env.VITE_SITE_ORIGIN || 'https://www.novel-agent.cn').replace(
  /\/$/,
  '',
)
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`
const SITE_HOST = new URL(SITE_ORIGIN).host

async function pingBaidu() {
  const token = process.env.BAIDU_SITE_TOKEN?.trim()
  if (!token) {
    console.log('[seo-ping] BAIDU_SITE_TOKEN 未设置，跳过百度 ping（见下方手动步骤）')
    return { ok: false, skipped: true }
  }

  const url = new URL('https://data.zz.baidu.com/ping')
  url.searchParams.set('site', SITE_HOST)
  url.searchParams.set('token', token)
  url.searchParams.set('sitemap', SITEMAP_URL)

  const res = await fetch(url, { method: 'GET' })
  const body = await res.text()
  const ok = res.ok && (body.includes('success') || body.includes('remain'))
  console.log(`[seo-ping] Baidu: HTTP ${res.status} ${body.slice(0, 200)}`)
  return { ok, body }
}

async function pingBing() {
  const apiKey = process.env.BING_WEBMASTER_API_KEY?.trim()
  if (apiKey) {
    const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ siteUrl: SITE_ORIGIN, feedUrl: SITEMAP_URL }),
    })
    const body = await res.text()
    console.log(`[seo-ping] Bing API: HTTP ${res.status} ${body.slice(0, 200)}`)
    return { ok: res.ok, body }
  }

  const pingUrl = `https://www.bing.com/webmasters/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  const res = await fetch(pingUrl)
  const body = await res.text()
  console.log(`[seo-ping] Bing ping: HTTP ${res.status}`)
  return { ok: res.ok, body }
}

async function pingIndexNow(urls) {
  const key = process.env.INDEXNOW_KEY?.trim()
  if (!key) {
    console.log('[seo-ping] INDEXNOW_KEY 未设置，跳过 IndexNow')
    return { ok: false, skipped: true }
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: SITE_HOST,
      key,
      keyLocation: `${SITE_ORIGIN}/${key}.txt`,
      urlList: urls,
    }),
  })
  const body = await res.text()
  console.log(`[seo-ping] IndexNow: HTTP ${res.status} ${body.slice(0, 120)}`)
  return { ok: res.ok || res.status === 202, body }
}

function printManualSteps() {
  console.log(`
[seo-ping] —— 一次性手动配置（Google 无法仅靠 ping 替代）——

1) Google Search Console
   https://search.google.com/search-console
   · 添加资源 → 网址前缀: ${SITE_ORIGIN}
   · 验证：DNS TXT（Cloudflare DNS 加记录）或 HTML 文件
   · 索引 → Sitemap → 提交: sitemap.xml
   · 可选 API：服务账号 + Search Console API（需 OAuth/域名验证）

2) 百度站长平台
   https://ziyuan.baidu.com/
   · 用户中心 → 站点管理 → 添加 ${SITE_HOST}
   · 验证站点（文件/HTML/DNS）
   · 数据引入 → sitemap → 提交 ${SITEMAP_URL}
   · 普通收录 → 复制 token → GitHub Secret: BAIDU_SITE_TOKEN

3) Bing Webmaster（与 GSC 可互相同步站点）
   https://www.bing.com/webmasters
   · 添加站点 → 提交 sitemap: ${SITEMAP_URL}

4) Cloudflare（避免误拦爬虫）
   Security → Bots → Bot Fight Mode 关闭，或 Verified Bots 允许
   Security → WAF → 勿对 User-Agent 含 Googlebot/Baiduspider 返回 Challenge
   部署后自检: node scripts/verify-seo-crawl.mjs
`)
}

async function main() {
  console.log(`[seo-ping] sitemap=${SITEMAP_URL}`)

  const baidu = await pingBaidu()
  const bing = await pingBing()
  await pingIndexNow([
    SITEMAP_URL,
    `${SITE_ORIGIN}/blog`,
    `${SITE_ORIGIN}/blog/how-to-choose-ai-novel-writing-tool`,
    `${SITE_ORIGIN}/compare`,
  ])

  console.log('[seo-ping] Google: 无官方 sitemap ping（2023 起已废弃），请在 Search Console 提交 sitemap')
  printManualSteps()

  if (baidu.skipped && !process.env.BING_WEBMASTER_API_KEY) {
    process.exit(0)
  }

  if (baidu.ok === false && !baidu.skipped) {
    process.exit(1)
  }
  if (bing.ok === false) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[seo-ping] error:', err)
  process.exit(1)
})
