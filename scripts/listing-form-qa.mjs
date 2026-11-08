/**
 * Listing form regression after When two-choice simplification (demo mode).
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('beam-mode', 'demo'))
  await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="post-photos-section"], form', { timeout: 15000 })

  const post = await page.evaluate(() => {
    const text = document.body.innerText || ''
    return {
      photosSection: !!document.querySelector('[data-testid="post-photos-section"]'),
      photoCount: (document.querySelector('[data-testid="post-photo-count"]')?.textContent || '').trim(),
      titleDetails: /Title\s*&\s*Details/i.test(text),
      locationCopy: /Where will the job take place\?/i.test(text),
      searchRadius: /Search radius/i.test(text),
      templates: /Use a template|Quick templates|Start from a template/i.test(text),
      asap: !!document.querySelector('[data-testid="post-when-asap"]'),
      scheduled: !!document.querySelector('[data-testid="post-when-scheduled"]'),
      today: !!document.querySelector('[data-testid="post-when-today"]'),
      tomorrow: !!document.querySelector('[data-testid="post-when-tomorrow"]'),
      thisWeek: !!document.querySelector('[data-testid="post-when-this-week"]'),
      asapNote: (document.querySelector('[data-testid="post-asap-note"]')?.textContent || '').trim(),
      timeHidden: !document.querySelector('[data-testid="post-time-window"]'),
    }
  })

  assert.equal(post.photosSection, true)
  assert.match(post.photoCount, /0\/5/)
  assert.equal(post.titleDetails, true)
  assert.equal(post.locationCopy, true)
  assert.equal(post.searchRadius, false)
  assert.equal(post.templates, false)
  assert.equal(post.asap, true)
  assert.equal(post.scheduled, true)
  assert.equal(post.today, false)
  assert.equal(post.tomorrow, false)
  assert.equal(post.thisWeek, false)
  assert.equal(post.asapNote, 'Arrival time confirmed with your helper.')
  assert.equal(post.timeHidden, true)

  await page.locator('[data-testid="post-when-scheduled"]').click()
  assert.equal(await page.locator('[data-testid="post-start-time"]').count(), 1)

  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('[data-testid="notifications-bell"]').count(), 0)
  assert.ok(
    await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="app-topnav"] a')].some((a) =>
        (a.getAttribute('href') || '').startsWith('/messages'),
      ),
    ),
  )

  console.log('listing-form-qa: OK')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
