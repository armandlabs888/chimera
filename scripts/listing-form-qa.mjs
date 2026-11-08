/**
 * Listing form + header bell removal QA (demo mode).
 * Asserts: photos UI, When dates+clock, no post radius/templates,
 * Title & Details, no notifications bell, Messages nav present.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  // Ensure demo shell (localStorage seed)
  await page.evaluate(() => {
    localStorage.setItem('beam-mode', 'demo')
  })
  await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="post-photos-section"], form', { timeout: 15000 })

  const post = await page.evaluate(() => {
    const text = document.body.innerText || ''
    return {
      photosSection: !!document.querySelector('[data-testid="post-photos-section"]'),
      photoInput: !!document.querySelector('[data-testid="post-photo-input"]'),
      photoCount: (document.querySelector('[data-testid="post-photo-count"]')?.textContent || '').trim(),
      titleDetails: /Title\s*&\s*Details/i.test(text),
      locationCopy: /Where will the job take place\?/i.test(text),
      searchRadius: /Search radius/i.test(text),
      withinMiUi: /Within\s+\d+\s*mi/i.test(text) && /radius/i.test(text),
      templates: /Use a template|Quick templates|Start from a template/i.test(text),
      morningChip: /\bMorning\b/.test(text) && /When/.test(text),
      afternoonChip: /Afternoon window|Evening window/.test(text),
      startTime: !!document.querySelector('input[type="time"]'),
      whenSection: /When/.test(text),
      todayChip: /Today/.test(text),
      tomorrowChip: /Tomorrow/.test(text),
    }
  })

  assert.equal(post.photosSection, true, 'photos section present')
  assert.equal(post.photoInput, true, 'photo file input present')
  assert.match(post.photoCount, /0\/5/, `photo count ${post.photoCount}`)
  assert.equal(post.titleDetails, true, 'Title & Details heading')
  assert.equal(post.locationCopy, true, 'location copy')
  assert.equal(post.searchRadius, false, 'no Search radius on post')
  assert.equal(post.templates, false, 'no templates UI')
  assert.equal(post.startTime, true, 'clock time input present')
  assert.equal(post.whenSection, true, 'When section present')
  assert.equal(post.todayChip, true, 'Today chip')
  assert.equal(post.tomorrowChip, true, 'Tomorrow chip')

  // Today chip should surface a local calendar date in label/preview
  const whenPreview = await page.locator('text=Shows as').first().textContent().catch(() => '')
  // Click Today if needed
  const todayBtn = page.getByRole('button', { name: /Today/i }).first()
  if (await todayBtn.count()) await todayBtn.click()
  await page.waitForTimeout(200)
  const afterToday = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) =>
      /Shows as/i.test(n.textContent || ''),
    )
    return el?.textContent || ''
  })
  assert.match(afterToday || whenPreview || '', /Today/i, 'Today when label')

  // Header: no bell, Messages intact
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  const header = await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="app-topnav"]')
    const links = nav
      ? [...nav.querySelectorAll('a')].map((a) => ({
          href: a.getAttribute('href') || '',
          text: (a.textContent || '').trim(),
        }))
      : []
    return {
      topnav: !!nav,
      bell: !!document.querySelector('[data-testid="notifications-bell"]'),
      messages: links.some(
        (l) => l.href === '/messages' || l.href.startsWith('/messages/') || /^Messages/i.test(l.text),
      ),
      account: !!document.querySelector('[data-testid="account-menu-trigger"]'),
    }
  })

  assert.equal(header.topnav, true, 'app topnav present in demo')
  assert.equal(header.bell, false, 'notifications bell removed')
  assert.equal(header.messages, true, 'Messages nav intact')
  assert.equal(header.account, true, 'account menu intact')

  // Mobile viewport header
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  const mobile = await page.evaluate(() => ({
    bell: !!document.querySelector('[data-testid="notifications-bell"]'),
    messagesDock: [...document.querySelectorAll('a')].some((a) => {
      const href = a.getAttribute('href') || ''
      return href === '/messages' || href.startsWith('/messages/')
    }),
  }))
  assert.equal(mobile.bell, false, 'mobile: no bell')
  assert.equal(mobile.messagesDock, true, 'mobile: Messages still reachable')

  console.log('listing-form-qa: OK')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
