#!/usr/bin/env node
/**
 * Build before/after contact sheets + copy key screenshots for the responsive audit.
 */
import { mkdirSync, copyFileSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = process.env.SHOT_DIR || '/opt/cursor/artifacts/responsive-audit'
const OUT = '/opt/cursor/artifacts'
const KEY = ['390x844', '375x667', '768x1024', '1280x720']
const PAGES = [
  'landing',
  'browse',
  'job-detail',
  'post-step1',
  'people-helper',
  'messages-drawer',
  'settings-profile',
]

async function loadThumb(phase, page, vp, size = 320) {
  const candidates = [
    join(ROOT, phase, `${page}__${vp}.png`),
    join(ROOT, 'before-keep', `${page}__${vp}.png`),
  ]
  const path = candidates.find((p) => existsSync(p))
  if (!path) return null
  const buf = await sharp(path)
    .resize(size, Math.round(size * 0.65), { fit: 'cover', position: 'top' })
    .png()
    .toBuffer()
  return { buf, path, meta: await sharp(path).metadata() }
}

async function sheet(phase, filename) {
  const thumbs = []
  const labels = []
  for (const page of PAGES) {
    for (const vp of KEY) {
      const t = await loadThumb(phase, page, vp, 280)
      if (!t) continue
      thumbs.push(t.buf)
      labels.push(`${page} ${vp}`)
    }
  }
  if (!thumbs.length) {
    console.log(`no thumbs for ${phase}`)
    return null
  }

  const cols = 4
  const cellW = 280
  const cellH = 200
  const labelH = 28
  const rows = Math.ceil(thumbs.length / cols)
  const width = cols * cellW
  const height = rows * (cellH + labelH)

  const composites = []
  for (let i = 0; i < thumbs.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col * cellW
    const y = row * (cellH + labelH)
    composites.push({
      input: await sharp(thumbs[i]).resize(cellW, cellH, { fit: 'cover', position: 'top' }).png().toBuffer(),
      left: x,
      top: y,
    })
    const svg = Buffer.from(
      `<svg width="${cellW}" height="${labelH}"><rect width="100%" height="100%" fill="#071330"/><text x="8" y="18" fill="#F7F9FC" font-size="12" font-family="sans-serif">${labels[i]}</text></svg>`,
    )
    composites.push({ input: svg, left: x, top: y + cellH })
  }

  const outPath = join(OUT, filename)
  await sharp({
    create: { width, height, channels: 3, background: '#E3E8EF' },
  })
    .composite(composites)
    .png()
    .toFile(outPath)
  console.log('wrote', outPath)
  return outPath
}

async function copyKeys() {
  const dest = join(OUT, 'responsive-key-shots')
  mkdirSync(dest, { recursive: true })
  for (const phase of ['before', 'after']) {
    for (const page of ['landing', 'browse', 'job-detail', 'post-step1']) {
      for (const vp of KEY) {
        const srcCandidates = [
          join(ROOT, phase, `${page}__${vp}.png`),
          join(ROOT, 'before-keep', `${page}__${vp}.png`),
        ]
        const src = srcCandidates.find((p) => existsSync(p))
        if (!src) continue
        const name = `${phase}_${page}_${vp}.png`
        copyFileSync(src, join(dest, name))
        copyFileSync(src, join(OUT, name))
      }
    }
  }
  console.log('copied key shots to', dest)
}

async function writeIssueReport() {
  const beforePath = join(ROOT, 'report-before.json')
  const afterPath = join(ROOT, 'report-after.json')
  if (!existsSync(beforePath) || !existsSync(afterPath)) {
    console.log('missing reports')
    return
  }
  const before = JSON.parse(readFileSync(beforePath, 'utf8'))
  const after = JSON.parse(readFileSync(afterPath, 'utf8'))

  const md = []
  md.push('# Responsive layout audit report')
  md.push('')
  md.push(`Generated ${new Date().toISOString()}`)
  md.push('')
  md.push(`Before: hard=${before.hardFails} soft=${before.softCount}`)
  md.push(`After: hard=${after.hardFails} soft=${after.softCount}`)
  md.push('')
  md.push('## Issues found and fixes')
  md.push('')
  md.push('| Page | Viewport | Problem | Fix |')
  md.push('| --- | --- | --- | --- |')
  md.push('| landing / how-it-works | 768-1024 | Float header links + Sign up clipped past viewport (overflow-x clip hid scroll) | Keep marketing links/hamburger at `lg` (1024+); constrain float shell width |')
  md.push('| job-detail | mobile | Sticky Make an offer bar covered by BottomNav | `mobile-sticky-above-dock` + higher z-index; extra page `pb-40` |')
  md.push('| post-step1 / post-step2 | mobile | Sticky Continue/Submit sat too low over dock | Use shared `--beam-mobile-dock-clearance` margin |')
  md.push('| people-helper / people-neighbor | mobile | Content clipped under BottomNav | Increase profile bottom padding via dock clearance |')
  md.push('| many forms | mobile | Inputs at 15px (iOS zoom) | Global mobile `input/textarea/select` 16px; form control class `text-[16px] sm:text-[15px]` |')
  md.push('| browse / landing | mobile | Tap targets under 40px (menu, Post CTA, chips, distance, categories) | Raise control heights to 40px+ |')
  md.push('| account / activity / match | mobile | Tabs, rate segs, intent links under 40px | min-height 40px on those controls |')
  md.push('| privacy table / browse categories | mobile | Wide table / chip row extends past viewport | Already in horizontal scroll wrappers (left as designed) |')
  md.push('| all (dev only) | mobile | Next.js dev badge overlaps BottomNav | Dev-only; hidden during audit screenshots; not shipped to prod |')
  md.push('')
  md.push('## Left unfixed')
  md.push('')
  md.push('- Next.js development badge overlap (local/dev only; absent in production).')
  md.push('- Some text-style links (inline legal/footer) remain visually shorter than 40px; primary CTAs and chrome controls meet the target.')
  md.push('- Auth pages/modals excluded by request (`src/components/auth/*`, `app/auth/*`).')
  md.push('')
  md.push('## Rerun')
  md.push('')
  md.push('```bash')
  md.push('npm run dev')
  md.push('AUDIT_PHASE=after STRICT=1 npm run test:responsive-audit')
  md.push('```')
  md.push('')

  const reportMd = join(OUT, 'responsive-audit-report.md')
  writeFileSync(reportMd, md.join('\n'))
  writeFileSync(join(ROOT, 'REPORT.md'), md.join('\n'))
  console.log('wrote', reportMd)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  await sheet('before', 'responsive_contact_sheet_before.png')
  await sheet('after', 'responsive_contact_sheet_after.png')
  await copyKeys()
  await writeIssueReport()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
