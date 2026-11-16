/**
 * Chrome shots at 1440 + 390: header + Choose a day, Kuni-like meta,
 * asserting no leading middots (including when skills wrap).
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'
const HELPER_ID = 'p-maya'

mkdirSync(OUT, { recursive: true })

async function applyPatch(page, patch) {
  await page.evaluate(
    ({ key, helperId, patch: p }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const person of state.people || []) {
        if (person.id === me) {
          person.accountRole = 'customer'
          person.isHelper = false
          person.skills = []
        }
        if (person.id === helperId) {
          Object.assign(person, p)
        }
      }
      state.reviews = (state.reviews || []).filter((r) => r.toId !== helperId)
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID, patch },
  )
}

async function seed(page, patch) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await applyPatch(page, patch)
  await page.goto(`${BASE}/people/${HELPER_ID}?demo=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await applyPatch(page, patch)
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('profile-header-meta').waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(100)
}

async function assertNoLeadingDots(page) {
  const result = await page.getByTestId('profile-header-meta').evaluate((row) => {
    const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
    const problems = []
    const painted = (dot) => {
      if (!dot || !dot.classList.contains('ph-sep-dot')) return false
      if (dot.classList.contains('ph-sep-dot-off')) return false
      const cs = getComputedStyle(dot)
      return cs.visibility !== 'hidden' && cs.display !== 'none'
    }
    const lines = new Map()
    for (const el of items) {
      const y = Math.round(el.getBoundingClientRect().top)
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y).push(el)
    }
    for (const [, els] of lines) {
      if (painted(els[0].previousElementSibling)) {
        problems.push(`leading · before ${(els[0].textContent || '').trim()}`)
      }
      for (let i = 1; i < els.length; i++) {
        if (!painted(els[i].previousElementSibling)) {
          problems.push(`glued before ${(els[i].textContent || '').trim()}`)
        }
      }
    }
    return {
      ok: problems.length === 0,
      problems,
      lines: [...lines.values()].map((els) =>
        els.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()),
      ),
    }
  })
  assert.ok(result.ok, JSON.stringify(result))
  console.log('lines', result.lines)
  return result
}

async function shotSection(page, name, width) {
  await page.setViewportSize({ width, height: width >= 1000 ? 1100 : 900 })
  await page.waitForTimeout(200)
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await page.waitForTimeout(120)
  await assertNoLeadingDots(page)
  const header = page.getByTestId('profile-header')
  const daySection = page.locator('section[aria-labelledby="day-heading"]')
  await daySection.waitFor({ state: 'visible' })
  const box1 = await header.boundingBox()
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

const kuniPatch = {
  name: 'Kuni Fujikumi',
  isHelper: true,
  accountRole: 'helper',
  skills: ['junk-removal'],
  otherSkillLabel: null,
  locationLabel: 'San Francisco, CA',
  city: 'San Francisco',
  stateCode: 'CA',
  createdAt: '2026-11-01T00:00:00.000Z',
  rating: 0,
  reviewCount: 0,
  jobsCompleted: 0,
  workStart: '08:00',
  workEnd: '17:00',
  timezone: 'America/Los_Angeles',
  availableNow: false,
  hourlyRate: 100,
  rateType: 'flat',
  serviceRadiusMiles: 25,
  bio: 'Reliable, Fast, and Friendly Junk Removal.',
}

const longSkillsPatch = {
  ...kuniPatch,
  skills: ['junk-removal', 'house-cleaning', 'moving'],
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(() =>
    chromium.launch({ headless: true }),
  )
  const page = await browser.newPage({ deviceScaleFactor: 2 })

  await seed(page, kuniPatch)
  await shotSection(page, 'meta-sep-kuni-1440.png', 1440)
  await shotSection(page, 'meta-sep-kuni-390.png', 390)

  await seed(page, longSkillsPatch)
  await shotSection(page, 'meta-sep-longskills-1440.png', 1440)
  await shotSection(page, 'meta-sep-longskills-390.png', 390)

  await browser.close()
  console.log('meta-sep-shots: OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
