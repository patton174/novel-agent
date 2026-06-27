/**
 * 从 seo-routes + blog catalog 生成 public/sitemap.xml
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { allSitemapEntries } from './seo-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, '..')

const SITE_ORIGIN =
  process.env.VITE_SITE_ORIGIN?.replace(/\/$/, '') || 'https://www.novel-agent.cn'

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSitemapXml(entries) {
  const urls = entries
    .map((entry) => {
      const lines = [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
      ]
      if (entry.lastmod) {
        lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
      }
      lines.push('  </url>')
      return lines.join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

async function main() {
  const entries = allSitemapEntries(SITE_ORIGIN)
  const xml = buildSitemapXml(entries)
  const targets = [
    path.join(frontendRoot, 'public/sitemap.xml'),
    path.join(frontendRoot, 'dist/sitemap.xml'),
  ]

  for (const target of targets) {
    try {
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, xml, 'utf8')
      console.log(`[sitemap] wrote ${path.relative(frontendRoot, target)} (${entries.length} urls)`)
    } catch (err) {
      if (target.includes('dist') && err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        continue
      }
      throw err
    }
  }
}

main().catch((err) => {
  console.error('[sitemap] failed:', err)
  process.exit(1)
})
