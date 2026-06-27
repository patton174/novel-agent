/**
 * 构建后预渲染公开营销页，供百度/Google 抓取完整 HTML。
 * 跳过：SKIP_PRERENDER=1
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { marketingPrerenderRoutes } from './seo-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')
const distDir = path.join(frontendRoot, 'dist')

const PREVIEW_HOST = process.env.PRERENDER_HOST ?? '127.0.0.1'

const ROUTES = marketingPrerenderRoutes()

const ROUTE_READY_SELECTOR = {
  '/': 'main',
  '/guide': 'main h1',
  '/compare': 'table',
  '/pricing': 'main',
  '/about': 'main',
  '/blog': 'main h1, main h2',
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function findFreePort(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, host, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((err) => {
        if (err) reject(err)
        else resolve(port)
      })
    })
  })
}

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function waitForHttpOk(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume()
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            resolve()
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        })
        req.on('error', reject)
        req.setTimeout(2000, () => {
          req.destroy(new Error('timeout'))
        })
      })
      return
    } catch {
      await sleep(500)
    }
  }
  throw new Error(`preview not ready: ${url}`)
}

function startPreview(port) {
  const isWin = process.platform === 'win32'
  const cmd = isWin ? 'pnpm.cmd' : 'pnpm'
  const proc = spawn(
    cmd,
    ['exec', 'vite', 'preview', '--host', PREVIEW_HOST, '--port', String(port), '--strictPort'],
    {
      cwd: frontendRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
      shell: isWin,
    },
  )
  proc.stdout?.on('data', (chunk) => {
    process.stdout.write(`[prerender:preview] ${chunk}`)
  })
  proc.stderr?.on('data', (chunk) => {
    process.stderr.write(`[prerender:preview] ${chunk}`)
  })
  return proc
}

function outputHtmlPath(route) {
  if (route === '/') {
    return path.join(distDir, 'index.html')
  }
  const segment = route.replace(/^\//, '')
  return path.join(distDir, segment, 'index.html')
}

async function writeHtml(route, html) {
  const target = outputHtmlPath(route)
  await fs.mkdir(path.dirname(target), { recursive: true })
  const stamped = html.includes('<!-- prerendered:')
    ? html
    : html.replace('<head>', `<head>\n    <!-- prerendered:${route} -->`)
  await fs.writeFile(target, stamped, 'utf8')
  console.log(`[prerender] wrote ${route} → ${path.relative(frontendRoot, target)}`)
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch (primaryErr) {
    console.warn('[prerender] bundled chromium missing, trying system Chrome:', primaryErr.message)
    return chromium.launch({ headless: true, channel: 'chrome' })
  }
}

async function prerenderRoutes(baseUrl) {
  const indexShellPath = path.join(distDir, 'index.html')
  const indexShellBackup = await fs.readFile(indexShellPath, 'utf8')

  const browser = await launchBrowser()

  for (const route of ROUTES) {
    await fs.writeFile(indexShellPath, indexShellBackup, 'utf8')

    const context = await browser.newContext({
      locale: 'zh-CN',
      userAgent:
        'Mozilla/5.0 (compatible; NovelAgentPrerender/1.0; +https://www.novel-agent.cn)',
    })
    const page = await context.newPage()
    const url = `${baseUrl}${route === '/' ? '/' : route}`
    const selector = ROUTE_READY_SELECTOR[route] ?? (route.startsWith('/blog/') ? 'article' : 'main')
    console.log(`[prerender] visiting ${url}`)
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
    await page.waitForSelector(selector, { timeout: 30_000 })
    await page.waitForFunction(() => document.title && document.title.length > 3, { timeout: 15_000 })
    await sleep(600)
    const html = await page.content()
    await writeHtml(route, html)
    await context.close()
  }

  await browser.close()
}

async function main() {
  if (process.env.SKIP_PRERENDER === '1') {
    console.log('[prerender] SKIP_PRERENDER=1, skip')
    return
  }

  if (!(await pathExists(distDir))) {
    console.error('[prerender] dist/ missing, run vite build first')
    process.exit(1)
  }

  const port = Number(process.env.PRERENDER_PORT) || (await findFreePort(PREVIEW_HOST))
  const baseUrl = `http://${PREVIEW_HOST}:${port}`
  console.log(`[prerender] preview ${baseUrl}`)

  const preview = startPreview(port)
  let exitCode = 0

  try {
    await waitForHttpOk(`${baseUrl}/`)
    await prerenderRoutes(baseUrl)
    console.log('[prerender] done')
  } catch (err) {
    console.error('[prerender] failed:', err)
    exitCode = 1
  } finally {
    preview.kill('SIGTERM')
    await sleep(300)
    if (!preview.killed) {
      preview.kill('SIGKILL')
    }
  }

  process.exit(exitCode)
}

main()
