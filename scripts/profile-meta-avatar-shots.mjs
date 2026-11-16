/**
 * Desktop (1440) + mobile (390) shots of public helper profile:
 * header meta separators + Choose a day copy + crisp avatar src.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'
const HELPER_ID = 'p-maya'
/** Prod Kuni-style Google OAuth thumbnail (96px) — display layer must upgrade. */
const GOOGLE_S96 =
  'https://lh3.googleusercontent.com/a/ACg8ocKRmweKG2_-efoyYCV8UKr5WCI-tPfur8Zfa8-yYSf57-zZDqs=s96-c'

mkdirSync(OUT, { recursive: true })

async function seed(page) {
  // Patch after the app writes demo state, then reload so React picks it up
  // (avoid the unload-persist race that can overwrite a mid-session localStorage edit).
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, helperId, avatar }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
        }
        if (p.id === helperId) {
          p.name = 'Kuni Fujikumi'
          p.avatar = avatar
          p.isHelper = true
          p.accountRole = 'helper'
          p.skills = ['junk-removal']
          p.otherSkillLabel = null
          p.locationLabel = 'San Francisco, CA'
          p.city = 'San Francisco'
          p.stateCode = 'CA'
          p.createdAt = '2026-11-01T00:00:00.000Z'
          p.rating = 0
          p.reviewCount = 0
          p.jobsCompleted = 0
          p.workStart = '08:00'
          p.workEnd = '17:00'
          p.timezone = 'America/Los_Angeles'
          p.availableNow = false
          p.hourlyRate = 100
          p.rateType = 'flat'
          p.serviceRadiusMiles = 25
          p.bio =
            'Reliable, Fast, and Friendly Junk Removal. Dedicated gig worker who loves helping people clear out the clutter.'
        }
      }
      state.reviews = (state.reviews || []).filter((r) => r.toId !== helperId)
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID, avatar: GOOGLE_S96 },
  )
  await page.goto(`${BASE}/people/${HELPER_ID}?demo=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  // Re-apply after mount in case browse unload re-persisted the prior in-memory state.
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, helperId, avatar }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
        }
        if (p.id === helperId) {
          p.name = 'Kuni Fujikumi'
          p.avatar = avatar
          p.isHelper = true
          p.accountRole = 'helper'
          p.skills = ['junk-removal']
          p.otherSkillLabel = null
          p.locationLabel = 'San Francisco, CA'
          p.city = 'San Francisco'
          p.stateCode = 'CA'
          p.createdAt = '2026-11-01T00:00:00.000Z'
          p.rating = 0
          p.reviewCount = 0
          p.jobsCompleted = 0
          p.workStart = '08:00'
          p.workEnd = '17:00'
          p.timezone = 'America/Los_Angeles'
          p.availableNow = false
          p.hourlyRate = 100
          p.rateType = 'flat'
          p.serviceRadiusMiles = 25
          p.bio =
            'Reliable, Fast, and Friendly Junk Removal. Dedicated gig worker who loves helping people clear out the clutter.'
        }
      }
      state.reviews = (state.reviews || []).filter((r) => r.toId !== helperId)
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID, avatar: GOOGLE_S96 },
  )
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
}

async function assertMetaAndCopy(page) {
  const meta = page.getByTestId('profile-header-meta')
  await meta.waitFor({ state: 'visible' })

  const metaCheck = await meta.evaluate((row) => {
    const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
    const labels = items.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    const problems = []
    const style = getComputedStyle(row)
    if (style.overflow !== 'hidden' && style.overflowX !== 'hidden') {
      problems.push('row must clip with overflow hidden')
    }
    const rowBox = row.getBoundingClientRect()
    const lines = new Map()
    for (const el of items) {
      const y = Math.round(el.getBoundingClientRect().top)
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y).push(el)
    }
    for (const [, els] of lines) {
      els.forEach((el, idx) => {
        const before = getComputedStyle(el, '::before')
        if (before.content === 'none' || before.content === 'normal') {
          problems.push(`missing ::before for ${el.textContent}`)
          return
        }
        const ml = parseFloat(before.marginInlineStart || before.marginLeft || '0')
        const w = parseFloat(before.width || '0')
        const r = el.getBoundingClientRect()
        const beforeRight = r.left + ml + w
        const fullyClipped = beforeRight <= rowBox.left + 0.5
        if (idx === 0 && !fullyClipped) {
          problems.push(`line-start · not clipped for ${el.textContent}`)
        }
        // Mid-line · must stay visible so "Joined …Junk" never glues.
        if (idx > 0 && fullyClipped) {
          problems.push(`mid-line · clipped (glued) for ${el.textContent}`)
        }
        // Padding gutter is the visual separator (flex items themselves abut).
        const pad = parseFloat(getComputedStyle(el).paddingInlineStart || '0')
        if (idx > 0 && pad < 8) {
          problems.push(`missing separator gutter for ${el.textContent}`)
        }
      })
    }
    return { labels, problems, itemCount: items.length }
  })
  assert.equal(metaCheck.problems.length, 0, JSON.stringify(metaCheck))
  assert.ok(metaCheck.labels.some((l) => /Junk Removal/i.test(l)), metaCheck.labels)
  assert.ok(metaCheck.labels.some((l) => /Joined/i.test(l)), metaCheck.labels)
  console.log('meta-ok', metaCheck.labels)

  const sub = page.locator('.php-block-sub').first()
  await sub.waitFor({ state: 'visible' })
  const copy = (await sub.innerText()).replace(/\s+/g, ' ').trim()
  assert.match(copy, /Pick a date for your request with Kuni\./)
  assert.match(copy, /working hours are shown under their name/)
  assert.doesNotMatch(copy, /next to their name/)
  assert.doesNotMatch(copy, /[—–]/)
  console.log('copy-ok', copy)

  const avatarInfo = await page.evaluate(() => {
    const img = document.querySelector('[data-testid="profile-header"] img')
    if (!img) return null
    return {
      src: img.currentSrc || img.src,
      srcSet: img.getAttribute('srcset'),
      sizes: img.getAttribute('sizes'),
      width: img.width,
      naturalWidth: img.naturalWidth,
    }
  })
  assert.ok(avatarInfo, 'avatar img missing')
  assert.match(avatarInfo.src, /=s512-c/)
  assert.doesNotMatch(avatarInfo.src, /=s96-c/)
  assert.equal(avatarInfo.sizes, '100px')
  console.log('avatar-ok', avatarInfo)
}

async function shotSection(page, name, width) {
  await page.setViewportSize({ width, height: width >= 1000 ? 1100 : 900 })
  await page.waitForTimeout(250)
  const header = page.getByTestId('profile-header')
  const day = page.locator('#day-heading')
  await header.waitFor({ state: 'visible' })
  await day.waitFor({ state: 'visible' })
  const box1 = await header.boundingBox()
  const daySection = page.locator('section[aria-labelledby="day-heading"]')
  const box2 = await daySection.boundingBox()
  assert.ok(box1 && box2)
  const x = Math.min(box1.x, box2.x)
  const y = Math.min(box1.y, box2.y)
  const right = Math.max(box1.x + box1.width, box2.x + box2.width)
  const bottom = Math.max(box1.y + box1.height, box2.y + box2.height)
  const path = join(OUT, name)
  await page.screenshot({
    path,
    clip: {
      x: Math.max(0, x - 8),
      y: Math.max(0, y - 8),
      width: Math.min(width - 4, right - x + 16),
      height: bottom - y + 16,
    },
  })
  console.log('wrote', path)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  await seed(page)
  await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
  // Wait for Google avatar pixels to load so naturalWidth is meaningful.
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-testid="profile-header"] img')
    return img && img.complete && img.naturalWidth >= 200
  }, null, { timeout: 20000 })
  await assertMetaAndCopy(page)
  await shotSection(page, 'profile-meta-choose-day-1440.png', 1440)
  await shotSection(page, 'profile-meta-choose-day-390.png', 390)
  await browser.close()
  console.log('profile-meta-avatar-shots: OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
