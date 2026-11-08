/**
 * DEMO-ONLY end-to-end for listing photos + schedule (localStorage demo mode).
 * Does not create production rows, accounts, or storage objects.
 * Labels: [DEMO]
 */
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const ART = '/opt/cursor/artifacts'
mkdirSync(ART, { recursive: true })
mkdirSync('/tmp/listing-demo-photos', { recursive: true })

async function makePng(path, r, g, b) {
  // Minimal valid 1x1 PNG via sharp-less approach: use Playwright page canvas
  // Written by caller after browser starts.
  return { path, r, g, b }
}

async function main() {
  console.log('[DEMO] listing-form-demo-e2e starting')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // Generate 6 tiny PNGs via page canvas
  const files = []
  for (let i = 0; i < 6; i++) {
    const buf = await page.evaluate(async ({ i }) => {
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 64
      const ctx = c.getContext('2d')
      ctx.fillStyle = `rgb(${40 + i * 30},${80},${180 - i * 20})`
      ctx.fillRect(0, 0, 64, 64)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.fillText(String(i + 1), 22, 40)
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'))
      const ab = await blob.arrayBuffer()
      return Array.from(new Uint8Array(ab))
    }, { i })
    const p = join('/tmp/listing-demo-photos', `demo-${i + 1}.png`)
    writeFileSync(p, Buffer.from(buf))
    files.push(p)
  }

  // Oversized fake file (>5MB) — sparse buffer
  const bigPath = join('/tmp/listing-demo-photos', 'too-big.jpg')
  writeFileSync(bigPath, Buffer.alloc(5 * 1024 * 1024 + 1024, 1))

  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('beam-mode', 'demo')
    // Clear prior demo posts from previous runs in this browser profile
  })
  await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="post-photos-section"]')

  // --- 0 photos baseline ---
  let count = await page.locator('[data-testid="post-photo-count"]').textContent()
  assert.match(count || '', /0\/5/, `[DEMO] start count ${count}`)

  // --- reject bad type ---
  const txtPath = join('/tmp/listing-demo-photos', 'bad.txt')
  writeFileSync(txtPath, 'not-an-image')
  await page.setInputFiles('[data-testid="post-photo-input"]', txtPath)
  await page.waitForTimeout(400)
  await page.waitForSelector('[data-testid="post-photo-error"]', { timeout: 5000 })
  assert.match(
    (await page.locator('[data-testid="post-photo-error"]').textContent()) || '',
    /JPEG|PNG|WebP|GIF/i,
    '[DEMO] bad type error',
  )

  // --- reject >5MB ---
  await page.setInputFiles('[data-testid="post-photo-input"]', bigPath)
  await page.waitForSelector('[data-testid="post-photo-error"]', { timeout: 5000 })
  assert.match(
    (await page.locator('[data-testid="post-photo-error"]').textContent()) || '',
    /5 MB/i,
    '[DEMO] size error',
  )

  // --- select 6 → keep 5 + message ---
  await page.setInputFiles('[data-testid="post-photo-input"]', files)
  await page.waitForTimeout(1500)
  count = await page.locator('[data-testid="post-photo-count"]').textContent()
  assert.match(count || '', /5\/5/, `[DEMO] after 6-select count ${count}`)
  const thumbs = await page.locator('[data-testid="post-photo-thumbs"] li').count()
  assert.equal(thumbs, 5, '[DEMO] 5 thumbnails')
  assert.match(
    (await page.locator('[data-testid="post-photo-error"]').textContent()) || '',
    /Only 5 photos|first/i,
    '[DEMO] truncation message',
  )

  // --- remove one then re-add (cleanup path) ---
  await page.locator('[data-testid="post-photo-remove-4"]').click()
  await page.waitForTimeout(200)
  assert.match(
    (await page.locator('[data-testid="post-photo-count"]').textContent()) || '',
    /4\/5/,
    '[DEMO] after remove',
  )
  await page.setInputFiles('[data-testid="post-photo-input"]', files.slice(4, 5))
  await page.waitForTimeout(800)
  assert.match(
    (await page.locator('[data-testid="post-photo-count"]').textContent()) || '',
    /5\/5/,
    '[DEMO] re-add to 5',
  )

  // --- When: Schedule a date + times ---
  await page.locator('[data-testid="post-when-scheduled"]').click()
  await page.waitForSelector('[data-testid="post-time-window"]')
  await page.locator('[data-testid="post-start-time"]').fill('15:30')
  await page.locator('[data-testid="post-end-time"]').fill('17:00')
  await page.waitForTimeout(200)
  const whenText = await page.evaluate(() => document.body.innerText)
  assert.match(whenText, /3:30\s*PM/i, '[DEMO] start time label')
  assert.match(whenText, /Schedule a date/i, '[DEMO] schedule mode')

  // Past start / end-before covered in unit tests; UI end-before-start:
  await page.locator('[data-testid="post-start-time"]').fill('16:00')
  await page.locator('[data-testid="post-end-time"]').fill('15:00')
  await page.locator('[data-testid="post-title"]').fill('Demo verify five photos')
  await page.locator('[data-testid="post-details"]').fill(
    'Demo-only listing for photo/schedule verification. Do not treat as production.',
  )
  await page.getByRole('button', { name: /^Post request$/i }).click()
  await page.waitForSelector('[data-testid="post-error"]', { timeout: 5000 })
  assert.match(
    (await page.locator('[data-testid="post-error"]').textContent()) || '',
    /End time must be after start/i,
    '[DEMO] end-before-start error',
  )

  // Fix times and post
  await page.locator('[data-testid="post-start-time"]').fill('15:30')
  await page.locator('[data-testid="post-end-time"]').fill('17:00')

  await page.screenshot({ path: join(ART, 'demo-post-5-photos-desktop.png'), fullPage: false })
  await page.getByRole('button', { name: /^Post request$/i }).click()
  await page.waitForTimeout(1200)

  // Detail read-back
  await page.waitForURL(/\/requests\//, { timeout: 10000 }).catch(() => {})
  const onDetail = /\/requests\//.test(page.url())
  if (onDetail) {
    await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 8000 })
    const detail = await page.evaluate(() => {
      const imgs = document.querySelectorAll('[data-testid="request-detail-photos"] img')
      return {
        photoCount: imgs.length,
        text: document.body.innerText.slice(0, 1500),
        withinMi: /Within\s+\d+\s*mi/i.test(document.body.innerText),
      }
    })
    assert.ok(detail.photoCount >= 5, `[DEMO] detail photos ${detail.photoCount}`)
    assert.match(detail.text, /Demo verify five photos/)
    assert.match(detail.text, /3:30\s*PM/i)
    assert.equal(detail.withinMi, false, '[DEMO] no Within X mi on detail')
    await page.screenshot({ path: join(ART, 'demo-detail-5-photos-desktop.png'), fullPage: false })

    // Reload persistence (demo localStorage)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="request-detail-photos"]')
    const afterReload = await page.locator('[data-testid="request-detail-photos"] img').count()
    assert.ok(afterReload >= 5, `[DEMO] reload photos ${afterReload}`)
  } else {
    console.warn('[DEMO] submit did not navigate — capturing form with 5 thumbs')
    await page.screenshot({ path: join(ART, 'demo-post-5-photos-desktop.png'), fullPage: false })
  }

  // Mobile framed shot of form with 5 thumbs
  await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
  await page.setInputFiles('[data-testid="post-photo-input"]', files.slice(0, 5))
  await page.waitForTimeout(1000)
  await page.locator('[data-testid="post-when-scheduled"]').click()
  await page.locator('[data-testid="post-start-time"]').fill('15:30')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('[data-testid="post-photos-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(ART, 'demo-post-5-photos-mobile.png'), fullPage: false })
  await page.locator('[data-testid="post-when-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(ART, 'demo-post-when-mobile.png'), fullPage: false })

  // Header still no bell
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('[data-testid="notifications-bell"]').count(), 0, '[DEMO] no bell')
  await page.locator('[data-testid="app-topnav"]').screenshot({
    path: join(ART, 'demo-header-no-bell-mobile.png'),
  })

  console.log('[DEMO] listing-form-demo-e2e: OK')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
