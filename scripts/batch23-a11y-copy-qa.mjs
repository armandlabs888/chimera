#!/usr/bin/env node
/**
 * Batch 2–3 QA (demo mode): em/en dash scan, small tap targets, screenshots.
 *
 * Run: NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *      BASE_URL=http://127.0.0.1:43123 node scripts/batch23-a11y-copy-qa.mjs
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/batch23-a11y-copy'
const STORAGE_KEY = 'beam-demo-v1'
const MIN_TAP = 40

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

function repoUserStringDashCheck() {
  const roots = ['src', 'app']
  const hits = []
  const stringish = /(['"`])(?:(?!\1)[\s\S])*[\u2013\u2014](?:(?!\1)[\s\S])*\1|>([^<]*[\u2013\u2014][^<]*)</

  function walk(dir) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name === 'node_modules' || name.name === '.git') continue
      const path = join(dir, name.name)
      if (name.isDirectory()) {
        walk(path)
        continue
      }
      if (!/\.(tsx?|jsx?|css|mjs)$/.test(name.name)) continue
      const text = readFileSync(path, 'utf8')
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
        if (!/[\u2013\u2014]/.test(line)) continue
        // Ignore pure CSS/comment blocks already filtered; flag JSX/text/string uses
        if (stringish.test(line) || /['"`][^'"`]*[\u2013\u2014]/.test(line)) {
          hits.push(`${path}:${i + 1}:${trimmed.slice(0, 140)}`)
        }
      }
    }
  }
  for (const root of roots) walk(join('/workspace', root))
  return hits
}

async function shot(page, name) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function ensureDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
}

async function collectVisibleText(page) {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const parts = []
    let node
    while ((node = walker.nextNode())) {
      const parent = node.parentElement
      if (!parent) continue
      const tag = parent.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue
      const t = node.textContent || ''
      if (t.trim()) parts.push(t)
    }
    // Also placeholders / aria / alt / title
    for (const el of document.querySelectorAll('[placeholder],[aria-label],[alt],[title]')) {
      for (const attr of ['placeholder', 'aria-label', 'alt', 'title']) {
        const v = el.getAttribute(attr)
        if (v) parts.push(v)
      }
    }
    return parts.join('\n')
  })
}

async function findSmallTargets(page) {
  return page.evaluate((min) => {
    const selectors = 'a, button, [role="button"], [role="link"], input, select, textarea, summary, [role="switch"]'
    const out = []
    for (const el of document.querySelectorAll(selectors)) {
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') continue
      let r = el.getBoundingClientRect()
      // Prefer wrapping <label> hit area for form controls when larger.
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        const lab = el.closest('label')
        if (lab) {
          const lr = lab.getBoundingClientRect()
          if (lr.height >= r.height) r = lr
        }
      }
      if (r.width === 0 || r.height === 0) continue
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue
      const tooShort = r.height + 0.5 < min
      const isIconish =
        el.tagName === 'BUTTON' ||
        el.getAttribute('role') === 'button' ||
        (el.tagName === 'A' && r.width < 120)
      const tooNarrow = isIconish && r.width + 0.5 < min
      if (!tooShort && !tooNarrow) continue
      const label = (
        el.getAttribute('aria-label') ||
        el.getAttribute('data-testid') ||
        el.textContent ||
        el.tagName
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 80)
      out.push({
        label,
        w: Math.round(r.width),
        h: Math.round(r.height),
        testid: el.getAttribute('data-testid') || '',
      })
    }
    return out
  }, MIN_TAP)
}

async function main() {
  const dashHits = repoUserStringDashCheck()
  console.log('repo user-string dash hits:', dashHits.length)
  for (const h of dashHits) console.log(' ', h)
  assert.equal(dashHits.length, 0, 'repo still has em/en dashes in user strings')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await ensureDemo(page)

  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY)
  const demoRequestId = (state.requests || []).find((r) => r.status === 'open')?.id || 'req-1'

  const paths = [
    '/',
    '/browse',
    '/post',
    '/safety',
    `/requests/${demoRequestId}`,
    '/messages',
    '/you',
    '/auth',
  ]

  const dashReport = []
  for (const path of paths) {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${BASE}${path}${path.includes('?') ? '&' : '?'}demo=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForTimeout(400)
    const text = await collectVisibleText(page)
    const em = (text.match(/\u2014/g) || []).length
    const en = (text.match(/\u2013/g) || []).length
    dashReport.push({ path, em, en })
    console.log(`dash scan ${path}: em=${em} en=${en}`)
  }
  const dashTotal = dashReport.reduce((n, r) => n + r.em + r.en, 0)
  assert.equal(dashTotal, 0, `rendered em/en dashes found: ${JSON.stringify(dashReport)}`)

  const smallByPage = {}
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of paths) {
    await page.goto(`${BASE}${path}${path.includes('?') ? '&' : '?'}demo=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForTimeout(400)
    // Open messages drawer if needed so its controls are measurable when on /messages
    if (path === '/messages') {
      await page.waitForTimeout(300)
    }
    const small = await findSmallTargets(page)
    smallByPage[path] = small
    console.log(`small targets ${path}: ${small.length}`)
    for (const s of small.slice(0, 12)) {
      console.log(`  ${s.w}x${s.h} ${s.testid || s.label}`)
    }
  }

  // Screenshots at desktop + mobile for required surfaces
  const shotSpecs = [
    { path: '/post', name: 'batch23-post' },
    { path: '/safety', name: 'batch23-safety' },
    { path: `/requests/${demoRequestId}`, name: 'batch23-request-detail' },
    { path: '/', name: 'batch23-landing-how', scrollTo: '#how-it-works' },
  ]

  for (const vp of [
    { w: 1280, h: 800, suffix: 'desktop' },
    { w: 390, h: 844, suffix: 'mobile' },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    for (const spec of shotSpecs) {
      await page.goto(`${BASE}${spec.path}?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      if (spec.scrollTo) {
        await page.locator(spec.scrollTo).scrollIntoViewIfNeeded()
        await page.waitForTimeout(200)
      }
      await shot(page, `${spec.name}-${vp.suffix}.png`)
    }
  }

  writeFileSync(
    join(OUT, 'batch23-qa-report.json'),
    JSON.stringify({ dashReport, dashTotal, smallByPage, repoDashHits: dashHits }, null, 2),
  )
  copyFileSync(join(OUT, 'batch23-qa-report.json'), join(LOCAL, 'batch23-qa-report.json'))

  // Soft assert: report remaining small targets but fail if critical known ones remain
  const criticalLabels = [/post a task/i, /^menu$/i, /view profile/i, /change city/i, /available now/i]
  const criticalFails = []
  for (const [path, items] of Object.entries(smallByPage)) {
    for (const item of items) {
      if (criticalLabels.some((re) => re.test(item.label) || re.test(item.testid))) {
        criticalFails.push({ path, ...item })
      }
    }
  }
  if (criticalFails.length) {
    console.error('critical small targets remain', criticalFails)
  }
  assert.equal(criticalFails.length, 0, `critical tap targets under ${MIN_TAP}px`)

  await browser.close()
  console.log('batch23 QA OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
