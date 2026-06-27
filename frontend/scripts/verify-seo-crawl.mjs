/**
 * 生产 SEO 冒烟：sitemap / robots / 营销页 / blog 对 Googlebot、Baiduspider 可访问。
 *
 * 用法：
 *   node scripts/verify-seo-crawl.mjs
 *   SEO_SITE_ORIGIN=https://www.novel-agent.cn node scripts/verify-seo-crawl.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readBlogCatalog } from './seo-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')

const SITE_ORIGIN = (process.env.SEO_SITE_ORIGIN || process.env.VITE_SITE_ORIGIN || 'https://www.novel-agent.cn').replace(
  /\/$/,
  '',
)

const CRAWLER_USER_AGENTS = [
  { name: 'browser', value: 'NovelAgentSeoVerify/1.0' },
  {
    name: 'Googlebot',
    value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  {
    name: 'Baiduspider',
    value: 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
  },
]

const REQUIRED_PATHS = ['/', '/compare', '/guide', '/blog']

function blogPaths() {
  return readBlogCatalog().map((entry) => `/blog/${entry.slug}`)
}

function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
}

function isChallengePage(status, headers, body) {
  if (status === 403 || status === 503) return true
  const mitigated = headers.get('cf-mitigated')
  if (mitigated && mitigated !== 'none') return true
  const lowered = body.toLowerCase()
  return (
    lowered.includes('just a moment') ||
    lowered.includes('cf-browser-verification') ||
    lowered.includes('attention required')
  )
}

function hasSeoBody(pathname, body) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path.endsWith('robots.txt')) {
    return (
      body.toLowerCase().includes('sitemap:') &&
      body.length > 20 &&
      !body.includes('id="root"')
    )
  }
  if (path.endsWith('sitemap.xml')) {
    return body.includes('<urlset') && body.length > 80 && !body.includes('id="root"')
  }
  if (body.length < 800) return false
  if (body.includes('<!-- prerendered:')) return true
  if (path.startsWith('/blog/')) {
    return body.includes('<article') || body.includes('蛙') || body.includes('Wawa') || body.length > 3500
  }
  return body.includes('<main') || body.includes('id="root"')
}

async function fetchCheck(url, userAgent) {
  const res = await fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml,text/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
  })
  const body = await res.text()
  return {
    status: res.status,
    headers: res.headers,
    body,
    blocked: isChallengePage(res.status, res.headers, body),
    seoOk: res.ok && hasSeoBody(new URL(url).pathname, body),
  }
}

async function verifyPath(pathname) {
  const url = `${SITE_ORIGIN}${pathname}`
  const failures = []

  for (const agent of CRAWLER_USER_AGENTS) {
    const result = await fetchCheck(url, agent.value)
    if (result.blocked) {
      failures.push(`${agent.name}: blocked/challenged (HTTP ${result.status}, cf-mitigated=${result.headers.get('cf-mitigated') ?? 'n/a'})`)
      continue
    }
    if (!result.seoOk) {
      const hint = result.body.includes('id="root"') ? ' (SPA shell — 需 prerender/静态文件部署)' : ''
      failures.push(`${agent.name}: HTTP ${result.status} but body too thin or missing SEO shell (${result.body.length} bytes)${hint}`)
    }
  }

  return failures
}

const SITE_VERIFICATION_FILES = [
  '/baidu_verify_codeva-dnPyRQNBR9.html',
  '/google7af7c046b0380f9d.html',
]

async function verifySiteVerificationFiles() {
  for (const pathname of SITE_VERIFICATION_FILES) {
    const url = `${SITE_ORIGIN}${pathname}`
    const res = await fetch(url, { headers: { 'User-Agent': CRAWLER_USER_AGENTS[0].value } })
    const body = (await res.text()).trim()
    if (!res.ok || body.length < 8 || body.includes('id="root"')) {
      return `${pathname} not served as static file (HTTP ${res.status})`
    }
    console.log(`[seo-verify] ${pathname} OK`)
  }
  return null
}

async function main() {
  console.log(`[seo-verify] origin=${SITE_ORIGIN}`)
  const errors = []

  const verifyFileError = await verifySiteVerificationFiles()
  if (verifyFileError) errors.push(verifyFileError)

  const robotsUrl = `${SITE_ORIGIN}/robots.txt`
  const sitemapUrl = `${SITE_ORIGIN}/sitemap.xml`

  const robots = await fetchCheck(robotsUrl, CRAWLER_USER_AGENTS[1].value)
  if (!robots.seoOk) {
    if (robots.body.includes('id="root"')) {
      errors.push('robots.txt returns SPA shell — dist 缺少 public/robots.txt，需重新 deploy-frontend')
    } else {
      errors.push(`robots.txt unavailable or invalid (${robots.status})`)
    }
  } else if (!robots.body.includes(sitemapUrl)) {
    errors.push(`robots.txt missing Sitemap: ${sitemapUrl}`)
  } else {
    console.log('[seo-verify] robots.txt OK')
  }

  const sitemap = await fetchCheck(sitemapUrl, CRAWLER_USER_AGENTS[1].value)
  if (!sitemap.seoOk) {
    if (sitemap.body.includes('id="root"')) {
      errors.push('sitemap.xml returns SPA shell — 运行 generate-sitemap 后重新 deploy-frontend')
    } else {
      errors.push(`sitemap.xml unavailable or invalid (${sitemap.status})`)
    }
  } else {
    const locs = parseSitemapLocs(sitemap.body)
    console.log(`[seo-verify] sitemap.xml OK (${locs.length} urls)`)
    for (const must of [...REQUIRED_PATHS, ...blogPaths()]) {
      const expected = `${SITE_ORIGIN}${must === '/' ? '' : must}`
      if (!locs.includes(expected)) {
        errors.push(`sitemap missing ${expected}`)
      }
    }
  }

  const paths = [...REQUIRED_PATHS, ...blogPaths()]
  for (const pathname of paths) {
    const pathErrors = await verifyPath(pathname)
    if (pathErrors.length) {
      errors.push(`${pathname}: ${pathErrors.join('; ')}`)
    } else {
      console.log(`[seo-verify] ${pathname} OK (browser + Googlebot + Baiduspider)`)
    }
  }

  const localSitemap = path.join(frontendRoot, 'public/sitemap.xml')
  if (fs.existsSync(localSitemap)) {
    const localLocs = parseSitemapLocs(fs.readFileSync(localSitemap, 'utf8'))
    if (localLocs.length < paths.length + 3) {
      errors.push(`local public/sitemap.xml only has ${localLocs.length} urls — run node scripts/generate-sitemap.mjs`)
    }
  }

  if (errors.length) {
    console.error('\n[seo-verify] FAILED:')
    for (const err of errors) console.error(`  - ${err}`)
    console.error('\nCloudflare 排查：Security → Bots → 允许 Verified bots；WAF 勿对 /blog/* 做 JS Challenge。')
    process.exit(1)
  }

  console.log('\n[seo-verify] all checks passed')
}

main().catch((err) => {
  console.error('[seo-verify] error:', err)
  process.exit(1)
})
