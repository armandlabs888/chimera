#!/usr/bin/env node
/**
 * Asserts profile meta middots: only BETWEEN same-line items, never at line start.
 * Covers empty-stats helpers, forced wrap, and a long multi-skill label.
 */
import assert from 'node:assert/strict'
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/profile-header-sep-fix'
const STORAGE_KEY = 'beam-demo-v1'
const HELPER_ID = 'p-maya'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function seedHelper(page, opts = {}) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, helperId, patch }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
        }
        if (p.id === helperId) {
          Object.assign(p, {
            isHelper: true,
            accountRole: 'helper',
            rating: 0,
            reviewCount: 0,
            jobsCompleted: 0,
            skills: ['handyman'],
            otherSkillLabel: null,
            locationLabel: 'Milpitas, CA',
            availableNow: true,
            availability: ['mornings'],
            serviceRadiusMiles: 15,
            hourlyRate: 50,
            rateType: 'hourly',
            name: 'Armand Mercado',
            workStart: '08:00',
            workEnd: '17:00',
            timezone: 'America/Los_Angeles',
            ...patch,
          })
        }
      }
      state.reviews = (state.reviews || []).filter((r) => r.toId !== helperId)
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID, patch: opts.patch || {} },
  )
  await page.goto(`${BASE}/people/${HELPER_ID}?demo=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, helperId, patch }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
        }
        if (p.id === helperId) {
          Object.assign(p, {
            isHelper: true,
            accountRole: 'helper',
            rating: 0,
            reviewCount: 0,
            jobsCompleted: 0,
            skills: ['handyman'],
            otherSkillLabel: null,
            locationLabel: 'Milpitas, CA',
            name: 'Armand Mercado',
            workStart: '08:00',
            workEnd: '17:00',
            timezone: 'America/Los_Angeles',
            ...patch,
          })
        }
      }
      state.reviews = (state.reviews || []).filter((r) => r.toId !== helperId)
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID, patch: opts.patch || {} },
  )
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
}

/** Visual + DOM checks: no leading/trailing ·, mid-line · visible, no glue. */
async function assertCleanSeparators(page) {
  const statsCount = await page.getByTestId('profile-header-stats').count()
  assert.equal(statsCount, 0, 'empty stats row must not render for 0 reviews/jobs')

  const meta = page.getByTestId('profile-header-meta')
  await meta.waitFor({ state: 'visible' })
  await page.waitForTimeout(80)

  const result = await meta.evaluate((row) => {
    const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
    const dots = [...row.querySelectorAll(':scope > .ph-sep-dot')]
    const problems = []

    const visiblePainted = (dot) => {
      if (dot.classList.contains('ph-sep-dot-off')) return false
      const cs = getComputedStyle(dot)
      return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'
    }

    // Group items by visual line
    const lines = new Map()
    for (const el of items) {
      const y = Math.round(el.getBoundingClientRect().top)
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y).push(el)
    }

    for (const [, els] of lines) {
      const first = els[0]
      const prev = first.previousElementSibling
      if (prev?.classList.contains('ph-sep-dot') && visiblePainted(prev)) {
        problems.push(`leading · before "${(first.textContent || '').trim()}"`)
      }
      for (let i = 1; i < els.length; i++) {
        const between = els[i].previousElementSibling
        if (!between?.classList.contains('ph-sep-dot') || !visiblePainted(between)) {
          problems.push(
            `missing mid-line · before "${(els[i].textContent || '').trim()}" (glued)`,
          )
        }
      }
    }

    // No painted · may sit at the flex row's left edge (line start).
    const rowLeft = row.getBoundingClientRect().left
    for (const dot of dots) {
      if (!visiblePainted(dot)) continue
      const box = dot.getBoundingClientRect()
      if (Math.abs(box.left - rowLeft) <= 1.5) {
        problems.push('painted · at row left edge')
      }
    }

    return {
      ok: problems.length === 0,
      problems,
      lineCount: lines.size,
      itemCount: items.length,
      paintedDots: dots.filter(visiblePainted).length,
      sample: items.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()),
    }
  })

  assert.ok(result.ok, `separator check failed: ${JSON.stringify(result)}`)
  assert.ok(result.itemCount >= 2, 'expected role + location (+ skills)')
  console.log('sep-ok', result)

  // Force a narrow wrap: line-start · must turn off; mid-line · stay on.
  await meta.evaluate((el) => {
    el.style.maxWidth = '160px'
  })
  await page.waitForTimeout(50)
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await page.waitForTimeout(100)

  const wrapped = await meta.evaluate((row) => {
    const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
    const dots = [...row.querySelectorAll(':scope > .ph-sep-dot')]
    const problems = []
    const visiblePainted = (dot) => {
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
      const first = els[0]
      const prev = first.previousElementSibling
      if (prev?.classList.contains('ph-sep-dot') && visiblePainted(prev)) {
        problems.push(`wrap leading · before ${first.textContent}`)
      }
      for (let i = 1; i < els.length; i++) {
        const between = els[i].previousElementSibling
        if (!between?.classList.contains('ph-sep-dot') || !visiblePainted(between)) {
          problems.push(`wrap glued before ${els[i].textContent}`)
        }
      }
    }
    return {
      ok: problems.length === 0,
      problems,
      lineCount: lines.size,
      offDots: dots.filter((d) => d.classList.contains('ph-sep-dot-off')).length,
    }
  })
  assert.ok(wrapped.lineCount >= 2, `expected forced wrap, got ${JSON.stringify(wrapped)}`)
  assert.ok(wrapped.offDots >= 1, `expected off wrap separators, got ${JSON.stringify(wrapped)}`)
  assert.ok(wrapped.ok, `wrap separator check failed: ${JSON.stringify(wrapped)}`)
  console.log('wrap-ok', wrapped)

  await meta.evaluate((el) => {
    el.style.maxWidth = ''
  })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await page.waitForTimeout(80)
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(() =>
    chromium.launch({ headless: true }),
  )
  try {
    for (const vp of [
      { name: 'desk', width: 1440, height: 900 },
      { name: 'mob', width: 390, height: 844, isMobile: true },
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        isMobile: Boolean(vp.isMobile),
        hasTouch: Boolean(vp.isMobile),
      })
      const page = await context.newPage()

      // Kuni-like short skills
      await seedHelper(page, {
        patch: {
          name: 'Kuni Fujikumi',
          locationLabel: 'San Francisco, CA',
          city: 'San Francisco',
          stateCode: 'CA',
          createdAt: '2026-11-01T00:00:00.000Z',
          skills: ['junk-removal'],
        },
      })
      await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
      await assertCleanSeparators(page)
      const kuniLabels = await page.getByTestId('profile-header-meta').evaluate((row) =>
        [...row.querySelectorAll('.ph-sep-item')].map((el) =>
          (el.textContent || '').replace(/\s+/g, ' ').trim(),
        ),
      )
      assert.deepEqual(kuniLabels.slice(0, 4), [
        'Helper',
        'San Francisco, CA',
        'Joined Nov 2026',
        'Junk Removal',
      ])
      await shot(page, `profile-header-sep-fix-kuni-${vp.name}.png`)

      // Long multi-skill list (forces wrap on desktop too)
      await seedHelper(page, {
        patch: {
          name: 'Kuni Fujikumi',
          locationLabel: 'San Francisco, CA',
          city: 'San Francisco',
          stateCode: 'CA',
          createdAt: '2026-11-01T00:00:00.000Z',
          skills: ['junk-removal', 'house-cleaning', 'moving'],
        },
      })
      await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
      await assertCleanSeparators(page)
      await shot(page, `profile-header-sep-fix-longskills-${vp.name}.png`)

      await context.close()
    }
    console.log('profile-header-sep-fix-qa PASS')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
