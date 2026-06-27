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

const reZh = /[\u4e00-\u9fff]/
const uiWords = [
  'Admin', 'Loading', 'Cancel', 'Save', 'Delete', 'Edit', 'Close', 'Refresh', 'Search',
  'Submit', 'Create', 'Update', 'Failed', 'Success', 'Online', 'OFFLINE', 'ONLINE',
  'No data', '暂无', 'Error', 'Back', 'Next', 'Previous', 'Confirm', 'Yes', 'No',
  'Welcome', 'Sign in', 'Sign up', 'Logout', 'Settings', 'Home', 'Dashboard', 'Billing',
  'Novels', 'Library', 'Bookstore', 'Retry', 'Copy', 'Download', 'Upload', 'Export',
  'Import', 'Filter', 'Sort', 'View', 'Add', 'Remove', 'Clear', 'Reset', 'Apply',
]

let total = 0
for (const file of walk('src/pages')) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')
  const hits = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue
    if (line.includes('t(') || line.includes('i18n.t') || line.includes('Trans')) continue
    const matches = [...line.matchAll(/['"`]([^'"`]{2,})['"`]/g)]
    for (const m of matches) {
      const s = m[1]
      if (/:(admin|common|dashboard|auth|editor|marketing)/.test(s)) continue
      if (/^[\.\/@#]/.test(s)) continue
      if (
        /^(sm|md|lg|xl|2xl|default|outline|ghost|danger|primary|secondary|muted|form|toolbar|icon|compact|labeled|before|after|online|offline|hidden|flex|grid|block|none|true|false|auto|center|left|right|top|bottom)$/i.test(
          s,
        )
      )
        continue
      if (/^[a-z][a-z0-9-]*$/.test(s) && s.length < 12) continue
      if (reZh.test(s)) {
        hits.push({ line: i + 1, text: s.slice(0, 120) })
        continue
      }
      if (uiWords.some((w) => s === w || s.includes(w))) hits.push({ line: i + 1, text: s.slice(0, 120) })
    }
  }
  if (hits.length) {
    console.log('\n' + file.replace(/\\/g, '/'))
    hits.forEach((h) => console.log('  L' + h.line + ': ' + h.text))
    total += hits.length
  }
}
console.log('\nTOTAL HITS:', total)
