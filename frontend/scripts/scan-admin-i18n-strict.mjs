import fs from 'fs'
import path from 'path'

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, files)
    else if (/\.tsx$/.test(ent.name) && !/\.test\./.test(ent.name)) files.push(p)
  }
  return files
}

const roots = ['src/components/admin', 'src/pages/admin']
const reZh = /[\u4e00-\u9fff]/
const skipLine = /^\s*(\/\/|\*|\/\*|\*\/)/

const tailwindRe =
  /^(sm|md|lg|xl|2xl|flex|grid|size-|text-|bg-|border|rounded|animate|min-|max-|px-|py-|gap-|space-|w-|h-|opacity|shadow|cursor|truncate|uppercase|tabular|shrink|overflow|items|justify|font-|leading|tracking|inline|block|hidden|relative|absolute|fixed|z-|col-|row-|order-|rotate|transition|duration|ease|hover:|dark:|focus:|disabled:)/

for (const root of roots) {
  for (const file of walk(root)) {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')
    const hits = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (skipLine.test(line)) continue
      if (/t\(['"`]admin:|i18n\.t\(['"`]admin:/.test(line)) continue

      const strs = [...line.matchAll(/['"`]([^'"`]{2,})['"`]/g)]
      for (const m of strs) {
        const s = m[1]
        if (s.includes('admin:') || s.includes('common:') || s.includes('dashboard:')) continue
        if (/^[\.\/@#\$]/.test(s)) continue
        if (/^(https?:|\/|@\/|#|rgb|hsl|var\(|calc\(|min\(|max\(|clamp\()/.test(s)) continue
        if (/^[A-Z_]+$/.test(s) && s.length <= 12) continue
        if (tailwindRe.test(s)) continue
        if (/^[a-z]+-[a-z0-9-]+$/.test(s) && s.includes('-')) continue
        if (/^(account|billing|user|vip|admin|hobby|all|active|failed|legal|announcements|pages|pricing|coupon|inline|modal|icon|compact|labeled|start|end|form|toolbar|primary|secondary|ghost|danger|outline|destructive|default|muted|neon|success|warning|RUNNING|PENDING|PAUSED|COMPLETED|FAILED|CANCELLED|DEBUG|INFO|SUCCESS|WARN|ERROR|Enter| )$/.test(s)) continue
        if (reZh.test(s)) hits.push({ line: i + 1, text: s.slice(0, 100) })
        else if (/^[A-Z][a-z]/.test(s) && s.length > 2) hits.push({ line: i + 1, text: s.slice(0, 100) })
      }
    }
    if (hits.length) {
      console.log('\n' + file)
      hits.forEach((h) => console.log('  L' + h.line + ': ' + h.text))
    }
  }
}
