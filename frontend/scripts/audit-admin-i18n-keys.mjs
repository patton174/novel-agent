import fs from 'fs'
import path from 'path'

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, files)
    else if (/\.(tsx|ts)$/.test(ent.name) && !/\.test\./.test(ent.name)) files.push(p)
  }
  return files
}

function flatten(obj, prefix = '') {
  const out = new Set()
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatten(v, key)) out.add(sub)
    } else {
      out.add(key)
    }
  }
  return out
}

const zh = JSON.parse(fs.readFileSync('src/i18n/locales/zh/admin.json', 'utf8'))
const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/admin.json', 'utf8'))
const zhKeys = flatten(zh)
const enKeys = flatten(en)

const used = new Set()
const roots = ['src/components/admin', 'src/pages/admin']
for (const root of roots) {
  for (const file of walk(root)) {
    const content = fs.readFileSync(file, 'utf8')
    for (const m of content.matchAll(/admin:([a-zA-Z0-9_.]+)/g)) {
      used.add(m[1])
    }
  }
}

const missingZh = [...used].filter((k) => !zhKeys.has(k)).sort()
const missingEn = [...used].filter((k) => !enKeys.has(k)).sort()

console.log('Used keys:', used.size)
console.log('Missing in zh:', missingZh.length)
missingZh.forEach((k) => console.log('  ', k))
console.log('Missing in en:', missingEn.length)
missingEn.forEach((k) => console.log('  ', k))
