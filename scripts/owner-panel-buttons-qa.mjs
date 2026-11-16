#!/usr/bin/env node
/**
 * Visual QA for owner Cancel job + Post another task button colors.
 * Screenshots → /opt/cursor/artifacts/owner-panel-buttons-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/owner-panel-buttons-qa'
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(OUT, { recursive: true })

function rgbOf(cssColor) {
  const m = String(cssColor).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function approx(a, b, tol = 2) {
  return Math.abs(a - b) <= tol
}

function assertRgb(actual, expected, label) {
  const rgb = rgbOf(actual)
  assert.ok(rgb, `${label}: parse ${actual}`)
  assert.ok(
    approx(rgb[0], expected[0]) && approx(rgb[1], expected[1]) && approx(rgb[2], expected[2]),
    `${label}: got ${actual}, expected rgb(${expected.join(',')})`,
  )
}

async function warmDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
}

async function seedOwnerOpenJob(page) {
  await warmDemo(page)
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    state.people = (state.people || []).map((p) =>
      p.id === me
        ? {
            ...p,
            accountRole: 'customer',
            isHelper: false,
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
            safetyDisclaimerAcceptedAt:
              p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
          }
        : p,
    )
    const mine = (state.requests || []).find(
      (r) => r.requesterId === me && (r.status === 'open' || r.id === 'req-you-open'),
    )
    if (mine) {
      state.requests = (state.requests || []).map((r) =>
        r.id === mine.id ? { ...r, status: 'open', requesterId: me } : r,
      )
    } else {
      state.requests = [
        {
          id: 'req-you-open',
          title: 'Assemble IKEA dresser',
          details: 'Need help with a flat-pack dresser this weekend.',
          category: 'furniture-assembly',
          neighborhood: 'east-austin',
          when: 'weekend',
          whenLabel: 'This weekend',
          budget: 75,
          status: 'open',
          requesterId: me,
          image: '',
          createdAt: new Date().toISOString(),
          locationLabel: 'East Austin, TX',
          lat: 30.2672,
          lng: -97.7431,
          radiusMiles: 5,
          budgetType: 'fixed',
        },
        ...(state.requests || []),
      ]
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function stylesFor(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      borderTopColor: cs.borderTopColor,
      borderTopWidth: cs.borderTopWidth,
      fontWeight: cs.fontWeight,
      width: cs.width,
      height: cs.height,
      borderRadius: cs.borderRadius,
      text: (el.textContent || '').trim(),
    }
  }, selector)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { checks: [] }
  try {
    for (const vp of [
      { name: 'desktop-1440', width: 1440, height: 900 },
      { name: 'mobile-390', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      })
      await seedOwnerOpenJob(page)

      await page.goto(`${BASE}/requests/req-you-open`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForSelector('[data-testid="request-owner-controls"]', { timeout: 20000 })
      await page.waitForSelector('[data-testid="cancel-job"]', { timeout: 10000 })

      const cancel = await stylesFor(page, '[data-testid="cancel-job"]')
      assert.ok(cancel, `${vp.name} cancel button`)
      assert.equal(cancel.text, 'Cancel job')
      assertRgb(cancel.color, [198, 40, 40], `${vp.name} cancel text`)
      assertRgb(cancel.borderTopColor, [242, 196, 196], `${vp.name} cancel border`)
      assertRgb(cancel.backgroundColor, [255, 255, 255], `${vp.name} cancel bg`)
      assert.ok(Number(cancel.fontWeight) >= 600, `${vp.name} cancel semibold`)

      const post = await stylesFor(
        page,
        '[data-testid="request-incoming-offers"] a[href="/post"]',
      )
      assert.ok(post, `${vp.name} post another task`)
      assert.equal(post.text, 'Post another task')
      assertRgb(post.backgroundColor, [29, 92, 229], `${vp.name} post bg`)
      assertRgb(post.color, [255, 255, 255], `${vp.name} post text`)

      const panel = page.locator('[data-testid="request-owner-controls"]')
      await panel.screenshot({
        path: join(OUT, `owner-panel-${vp.name}.png`),
      })

      await page.getByTestId('cancel-job').click()
      await page.waitForSelector('[data-testid="cancel-job-confirm"]', { timeout: 5000 })
      const confirm = await stylesFor(page, '[data-testid="cancel-job-confirm-confirm"]')
      assert.ok(confirm, `${vp.name} confirm button`)
      assertRgb(confirm.backgroundColor, [198, 40, 40], `${vp.name} confirm bg`)
      assertRgb(confirm.color, [255, 255, 255], `${vp.name} confirm text`)
      await page.locator('[data-testid="cancel-job-confirm"]').screenshot({
        path: join(OUT, `cancel-confirm-${vp.name}.png`),
      })
      await page.getByTestId('cancel-job-confirm-cancel').click()

      // Browse detail panel (desktop) / drawer (mobile)
      await page.goto(`${BASE}/browse?demo=1&radius=all`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForSelector('[data-testid="browse-v3"]', { timeout: 20000 })

      // Ensure owner job is selected: find row for req-you-open if present
      const ownerRow = page.locator('[data-testid="browse-job-row"]').filter({
        hasText: /Assemble IKEA|req-you-open|IKEA/i,
      })
      if ((await ownerRow.count()) > 0) {
        await ownerRow.first().click()
      } else {
        // Seed a visible owner open job near browse pin, then reopen browse
        await page.evaluate((key) => {
          const state = JSON.parse(localStorage.getItem(key) || '{}')
          const me = state.currentUserId || 'user-you'
          const mePerson = (state.people || []).find((p) => p.id === me)
          state.requests = [
            {
              id: 'req-you-open',
              title: 'Assemble IKEA dresser',
              details: 'Need help with a flat-pack dresser this weekend.',
              category: 'furniture-assembly',
              neighborhood: 'east-austin',
              when: 'weekend',
              whenLabel: 'This weekend',
              budget: 75,
              status: 'open',
              requesterId: me,
              image: '',
              createdAt: new Date().toISOString(),
              locationLabel: mePerson?.locationLabel || 'Austin, TX',
              lat: mePerson?.lat || 30.2672,
              lng: mePerson?.lng || -97.7431,
              radiusMiles: 50,
              budgetType: 'fixed',
            },
            ...(state.requests || []).filter((r) => r.id !== 'req-you-open'),
          ]
          localStorage.setItem(key, JSON.stringify(state))
        }, STORAGE_KEY)
        await page.goto(`${BASE}/browse?demo=1&radius=all`, {
          waitUntil: 'networkidle',
          timeout: 60000,
        })
        await page.waitForSelector('[data-testid="browse-job-row"]', { timeout: 15000 })
        await page
          .locator('[data-testid="browse-job-row"]')
          .filter({ hasText: /Assemble IKEA/i })
          .first()
          .click()
      }

      if (vp.width >= 1024) {
        await page.waitForSelector('[data-testid="browse-owner-controls"]', {
          timeout: 15000,
        })
        const browseCancel = await stylesFor(
          page,
          '[data-testid="browse-owner-controls"] [data-testid="cancel-job"]',
        )
        assert.ok(browseCancel, `${vp.name} browse cancel`)
        assertRgb(browseCancel.color, [198, 40, 40], `${vp.name} browse cancel text`)
        assertRgb(
          browseCancel.borderTopColor,
          [242, 196, 196],
          `${vp.name} browse cancel border`,
        )
        await page.locator('[data-testid="browse-owner-controls"]').screenshot({
          path: join(OUT, `browse-panel-owner-${vp.name}.png`),
        })
      } else {
        // Mobile drawer
        const drawerCancel = page.locator('[data-testid="cancel-job"]')
        await drawerCancel.first().waitFor({ timeout: 15000 })
        const drawerStyles = await stylesFor(page, '[data-testid="cancel-job"]')
        assert.ok(drawerStyles, `${vp.name} drawer cancel`)
        assertRgb(drawerStyles.color, [198, 40, 40], `${vp.name} drawer cancel text`)
        assertRgb(
          drawerStyles.borderTopColor,
          [242, 196, 196],
          `${vp.name} drawer cancel border`,
        )
        const drawer = page.locator('[data-testid="browse-job-drawer"], [role="dialog"]').first()
        if (await drawer.count()) {
          await drawer.screenshot({ path: join(OUT, `browse-drawer-owner-${vp.name}.png`) })
        } else {
          await page.screenshot({
            path: join(OUT, `browse-drawer-owner-${vp.name}.png`),
            fullPage: false,
          })
        }
      }

      report.checks.push({ viewport: vp.name, ok: true })
      console.log(`ok ${vp.name}`)
      await page.close()
    }

    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
    console.log(`owner-panel-buttons-qa → ${OUT}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
