#!/usr/bin/env node
/**
 * Reproduces the production bug: helper with 0 reviews / no rating / 0 jobs.
 * Asserts no leading/trailing middots and no empty stats row at 1280 and 390.
 */
import assert from 'node:assert/strict'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
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

async function seedZeroReviewHelper(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, helperId }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
        }
        if (p.id === helperId) {
          p.isHelper = true
          p.accountRole = 'helper'
          p.rating = 0
          p.reviewCount = 0
          p.jobsCompleted = 0
          p.skills = ['handyman']
          p.otherSkillLabel = null
          p.locationLabel = 'Milpitas, CA'
          p.availableNow = true
          p.availability = ['mornings']
          p.serviceRadiusMiles = 15
          p.hourlyRate = 50
          p.rateType = 'hourly'
          p.name = 'Armand Mercado'
        }
      }
      state.reviews = (state.reviews || []).filter((r) => r.toId !== helperId)
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID },
  )
}

async function assertCleanSeparators(page) {
  const statsCount = await page.getByTestId('profile-header-stats').count()
  assert.equal(statsCount, 0, 'empty stats row must not render for 0 reviews/jobs')

  const meta = page.getByTestId('profile-header-meta')
  await meta.waitFor({ state: 'visible' })

  const result = await meta.evaluate((row) => {
    const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
    const style = getComputedStyle(row)
    const problems = []
    if (style.overflow !== 'hidden' && style.overflowX !== 'hidden') {
      problems.push('row must clip with overflow hidden')
    }

    const text = (row.textContent || '').replace(/\s+/g, ' ').trim()
    if (text.startsWith('·') || text.startsWith('•')) problems.push('row text starts with middot')
    if (text.endsWith('·') || text.endsWith('•')) problems.push('row text ends with middot')

    const rowBox = row.getBoundingClientRect()
    const lines = new Map()
    for (const el of items) {
      const y = Math.round(el.getBoundingClientRect().top)
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y).push(el)
    }

    for (const [, els] of lines) {
      els.forEach((el, idx) => {
        const r = el.getBoundingClientRect()
        const before = getComputedStyle(el, '::before')
        if (before.content === 'none' || before.content === 'normal') {
          problems.push(`missing ::before for ${el.textContent}`)
          return
        }
        const ml = parseFloat(before.marginInlineStart || before.marginLeft || '0')
        const w = parseFloat(before.width || '0')
        const beforeRight = r.left + ml + w
        const fullyClipped = beforeRight <= rowBox.left + 0.5
        const lineStart = idx === 0
        if (lineStart && !fullyClipped) {
          problems.push(`line-start · not clipped for ${el.textContent}`)
        }
        if (!lineStart && fullyClipped) {
          problems.push(`mid-line · clipped (glued) for ${el.textContent}`)
        }
        const label = (el.textContent || '').trim()
        if (label.startsWith('·') || label.endsWith('·')) {
          problems.push(`text middot in ${label}`)
        }
      })
    }

    return {
      ok: problems.length === 0,
      problems,
      lineCount: lines.size,
      itemCount: items.length,
      sample: items.map((el) => (el.textContent || '').trim()),
    }
  })

  assert.ok(result.ok, `separator check failed: ${JSON.stringify(result)}`)
  assert.ok(result.itemCount >= 2, 'expected role + location (+ skills)')
  console.log('sep-ok', result)

  // Force a narrow wrap and ensure line-start · stay clipped (no leading middot).
  await meta.evaluate((el) => {
    el.style.maxWidth = '180px'
  })
  await page.waitForTimeout(40)
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await page.waitForTimeout(80)
  const wrapped = await meta.evaluate((row) => {
    const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
    const rowBox = row.getBoundingClientRect()
    const ys = new Set(items.map((el) => Math.round(el.getBoundingClientRect().top)))
    const problems = []
    const lines = new Map()
    for (const el of items) {
      const y = Math.round(el.getBoundingClientRect().top)
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y).push(el)
    }
    for (const [, els] of lines) {
      const el = els[0]
      const r = el.getBoundingClientRect()
      const before = getComputedStyle(el, '::before')
      const ml = parseFloat(before.marginInlineStart || before.marginLeft || '0')
      const w = parseFloat(before.width || '0')
      const beforeRight = r.left + ml + w
      if (beforeRight > rowBox.left + 0.5) {
        problems.push(`wrap line-start · visible for ${el.textContent}`)
      }
      for (let i = 1; i < els.length; i++) {
        const mid = els[i]
        const b = getComputedStyle(mid, '::before')
        const mml = parseFloat(b.marginInlineStart || b.marginLeft || '0')
        const mw = parseFloat(b.width || '0')
        const mr = mid.getBoundingClientRect()
        if (mr.left + mml + mw <= rowBox.left + 0.5) {
          problems.push(`mid-line · clipped after wrap for ${mid.textContent}`)
        }
      }
    }
    return {
      ok: problems.length === 0,
      problems,
      lineCount: ys.size,
    }
  })
  assert.ok(wrapped.lineCount >= 2, `expected forced wrap, got ${JSON.stringify(wrapped)}`)
  assert.ok(wrapped.ok, `wrap separator check failed: ${JSON.stringify(wrapped)}`)
  console.log('wrap-ok', wrapped)

  // Restore natural width for screenshots.
  await meta.evaluate((el) => {
    el.style.maxWidth = ''
  })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await page.waitForTimeout(80)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { ok: true, shots: [] }
  try {
    for (const vp of [
      { name: 'desk', width: 1280, height: 800 },
      { name: 'mob', width: 390, height: 844, isMobile: true },
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: Boolean(vp.isMobile),
        hasTouch: Boolean(vp.isMobile),
      })
      const page = await context.newPage()
      await seedZeroReviewHelper(page)
      await page.goto(`${BASE}/people/${HELPER_ID}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
      await page.waitForTimeout(300)
      await assertCleanSeparators(page)

      const body = await page.getByTestId('profile-header').innerText()
      assert.ok(!/[—–]/.test(body), 'no em/en dashes')
      assert.ok(!/\bVerified\b/.test(body), 'no Verified badge')
      assert.ok(!/0 reviews/i.test(body), 'must not show 0 reviews')
      assert.ok(!/0 jobs/i.test(body), 'must not show 0 jobs')

      const name = `profile-header-sep-fix-${vp.name}.png`
      await shot(page, name)
      report.shots.push(name)
      await context.close()
    }

    writeFileSync(join(OUT, 'profile-header-sep-fix-qa.json'), JSON.stringify(report, null, 2))
    console.log('profile-header-sep-fix-qa PASS')
  } catch (err) {
    report.ok = false
    report.error = String(err)
    writeFileSync(join(OUT, 'profile-header-sep-fix-qa.json'), JSON.stringify(report, null, 2))
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
