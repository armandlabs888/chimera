#!/usr/bin/env node
/**
 * Neighbor helper-access gate QA + required screenshots:
 *  - neighbor own public profile (/you) @ 1440x900 and 390x844 (no Become a helper section)
 *  - neighbor visiting /onboarding/helper → redirected to Get verified
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/neighbor-helper-gate'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name, { fullPage = false } = {}) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

/**
 * Force neighbor (non-helper) demo identity for the whole browser context.
 * Intercepts localStorage writes so BeamContext saveState cannot restore helper seed.
 */
async function installNeighborSeed(context, { verified = false } = {}) {
  await context.addInitScript(
    ({ key, verified }) => {
      function patchState(raw) {
        let state
        try {
          state = raw ? JSON.parse(raw) : null
        } catch {
          state = null
        }
        if (!state || !Array.isArray(state.people) || !state.people.length) return raw
        const me = state.currentUserId || 'user-you'
        for (const p of state.people) {
          if (p.id !== me) continue
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
          p.availableNow = false
          p.availability = []
          p.hourlyRate = 0
          p.rateType = 'hourly'
          p.rating = 0
          p.reviewCount = 0
          p.jobsCompleted = 0
          p.workStart = null
          p.workEnd = null
          p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z'
        }
        if (state.helperVerification) {
          state.helperVerification.status = verified ? 'approved' : 'unverified'
          state.helperVerification.lastCheckResult = verified ? 'matched' : null
        }
        return JSON.stringify(state)
      }

      try {
        const current = localStorage.getItem(key)
        if (current) localStorage.setItem(key, patchState(current))
      } catch {
        /* ignore */
      }

      const originalSetItem = localStorage.setItem.bind(localStorage)
      localStorage.setItem = (k, v) => {
        if (k === key) return originalSetItem(k, patchState(String(v)))
        return originalSetItem(k, v)
      }
    },
    { key: STORAGE_KEY, verified },
  )
}

async function assertNeighborSeed(page, { verified = false } = {}) {
  const role = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const person = (state.people || []).find((p) => p.id === me)
    return {
      accountRole: person?.accountRole,
      isHelper: person?.isHelper,
      skills: person?.skills?.length ?? 0,
      verification: state.helperVerification?.status ?? null,
    }
  }, STORAGE_KEY)
  assert.equal(role.accountRole, 'customer', `seed neighbor role: ${JSON.stringify(role)}`)
  assert.equal(role.isHelper, false, `seed neighbor isHelper: ${JSON.stringify(role)}`)
  assert.equal(role.skills, 0, `seed neighbor skills: ${JSON.stringify(role)}`)
  if (verified) assert.equal(role.verification, 'approved')
  else assert.notEqual(role.verification, 'approved')
}

async function openDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  // First boot may hydrate helper seed into memory before setItem patch runs; reload
  // so React reads the patched neighbor state from localStorage.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { ok: true, shots: [], gatedRoutes: ['/onboarding/helper'] }
  try {
    // Neighbor own public profile — desktop 1440x900
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      })
      await installNeighborSeed(context, { verified: false })
      const page = await context.newPage()
      await openDemo(page)
      await assertNeighborSeed(page, { verified: false })
      await page.goto(`${BASE}/you?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('you-page').waitFor({ state: 'visible', timeout: 20000 })
      await page.getByTestId('you-preview-bar').waitFor({ state: 'visible' })
      assert.equal(await page.getByTestId('you-become-helper').count(), 0)
      assert.equal(await page.getByTestId('you-become-helper-cta').count(), 0)
      assert.equal(await page.getByTestId('helper-services').count(), 0)
      const body = await page.locator('[data-testid="you-page"]').innerText()
      assert.doesNotMatch(body, /Become a helper/)
      assert.doesNotMatch(body, /Set your skills, service area, and rate/)
      assert.match(body, /Neighbor/)
      await page.waitForTimeout(200)
      await shot(page, 'neighbor-public-profile-1440x900.png')
      report.shots.push('neighbor-public-profile-1440x900.png')
      await context.close()
    }

    // Neighbor own public profile — mobile 390x844
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      })
      await installNeighborSeed(context, { verified: false })
      const page = await context.newPage()
      await openDemo(page)
      await assertNeighborSeed(page, { verified: false })
      await page.goto(`${BASE}/you?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('you-page').waitFor({ state: 'visible', timeout: 20000 })
      assert.equal(await page.getByTestId('you-become-helper').count(), 0)
      assert.equal(await page.getByTestId('helper-services').count(), 0)
      const body = await page.locator('[data-testid="you-page"]').innerText()
      assert.match(body, /Neighbor/)
      await page.waitForTimeout(200)
      await shot(page, 'neighbor-public-profile-390x844.png')
      report.shots.push('neighbor-public-profile-390x844.png')
      await context.close()
    }

    // Neighbor visiting helper editor → Get verified
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      })
      await installNeighborSeed(context, { verified: false })
      const page = await context.newPage()
      await openDemo(page)
      await assertNeighborSeed(page, { verified: false })
      await page.goto(`${BASE}/onboarding/helper?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForURL(/\/verify/, { timeout: 20000 })
      assert.match(page.url(), /\/verify/)
      await page.getByTestId('verify-form').or(page.getByTestId('verify-approved')).waitFor({
        state: 'visible',
        timeout: 20000,
      })
      const heading = await page.locator('h1').first().innerText()
      assert.match(heading, /Get verified|You.?re verified/i)
      await page.waitForTimeout(200)
      await shot(page, 'neighbor-helper-editor-redirect-verify-1440x900.png')
      report.shots.push('neighbor-helper-editor-redirect-verify-1440x900.png')
      await context.close()
    }

    // Neighbor with approved verification may open the helper editor
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      await installNeighborSeed(context, { verified: true })
      const page = await context.newPage()
      await openDemo(page)
      await assertNeighborSeed(page, { verified: true })
      await page.goto(`${BASE}/onboarding/helper?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.getByTestId('helper-skills-grid').first().waitFor({
        state: 'visible',
        timeout: 20000,
      })
      assert.match(page.url(), /\/onboarding\/helper/)
      await context.close()
    }

    // Helper-role signup (not yet published) keeps editor access without verification
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      await context.addInitScript(({ key }) => {
        const originalSetItem = localStorage.setItem.bind(localStorage)
        localStorage.setItem = (k, v) => {
          if (k !== key) return originalSetItem(k, v)
          try {
            const state = JSON.parse(String(v))
            const me = state.currentUserId || 'user-you'
            for (const p of state.people || []) {
              if (p.id !== me) continue
              p.accountRole = 'helper'
              p.isHelper = false
              p.skills = []
              p.hourlyRate = 0
              p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z'
            }
            if (state.helperVerification) {
              state.helperVerification.status = 'unverified'
              state.helperVerification.lastCheckResult = null
            }
            return originalSetItem(k, JSON.stringify(state))
          } catch {
            return originalSetItem(k, v)
          }
        }
      }, { key: STORAGE_KEY })
      const page = await context.newPage()
      await openDemo(page)
      await page.goto(`${BASE}/onboarding/helper?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.getByTestId('helper-skills-grid').first().waitFor({
        state: 'visible',
        timeout: 20000,
      })
      assert.match(page.url(), /\/onboarding\/helper/)
      await context.close()
    }

    // Header Become a helper for signed-in neighbor → /verify
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      })
      await installNeighborSeed(context, { verified: false })
      const page = await context.newPage()
      await openDemo(page)
      await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForFunction(() => {
        const link = [...document.querySelectorAll('[data-testid="landing-nav"] a')].find((a) =>
          /Become a helper/i.test(a.textContent || ''),
        )
        return link && link.getAttribute('href') === '/verify'
      }, null, { timeout: 20000 })
      const link = page.locator('[data-testid="landing-nav"] a', { hasText: 'Become a helper' }).first()
      assert.equal(await link.getAttribute('href'), '/verify')
      await context.close()
    }

    // /you?tab=helper for neighbor → /verify
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      await installNeighborSeed(context, { verified: false })
      const page = await context.newPage()
      await openDemo(page)
      await page.goto(`${BASE}/you?tab=helper&demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForURL(/\/verify/, { timeout: 20000 })
      assert.match(page.url(), /\/verify/)
      await context.close()
    }

    writeFileSync(join(OUT, 'neighbor-helper-gate-qa.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'neighbor-helper-gate-qa.json'), JSON.stringify(report, null, 2))
    console.log('neighbor-helper-gate-qa PASS', report)
  } catch (err) {
    report.ok = false
    report.error = String(err)
    writeFileSync(join(OUT, 'neighbor-helper-gate-qa.json'), JSON.stringify(report, null, 2))
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
