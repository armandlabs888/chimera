#!/usr/bin/env node
/**
 * Popular gigs — Nearby vs city copy QA + screenshots.
 * Unset state: demo `?gigsLoc=unset` (inert in live mode).
 * City state: browse location pin = San Jose.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BROWSE_LOCATION_STORAGE_KEY = 'beam-browse-location-v1'
const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts/popular-gigs-nearby-copy'
mkdirSync(OUT, { recursive: true })
mkdirSync('artifacts/popular-gigs-nearby-copy', { recursive: true })

// Austin pin keeps demo seed jobs in-radius so the grid (and mobile CTA) render.
const AUSTIN_PIN = {
  city: 'Austin',
  stateCode: 'TX',
  lat: 30.2672,
  lng: -97.7431,
  label: 'Austin, TX',
}

async function shot(page, name) {
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({
    path: `artifacts/popular-gigs-nearby-copy/${name}.png`,
    fullPage: false,
  })
  console.log(`saved ${path}`)
}

async function waitGigs(page) {
  await page.waitForSelector('[data-testid="popular-gigs"][data-ready="true"]', {
    timeout: 20000,
  })
}

async function assertUnsetCopy(page) {
  const section = page.getByTestId('popular-gigs')
  assert.equal(await section.getAttribute('data-has-city'), 'false')
  const heading = await page.locator('#popular-gigs-heading').innerText()
  assert.match(heading, /Popular gigs near you/i)
  assert.doesNotMatch(heading, /near\s+Nearby/i)
  const chip = page.getByTestId('popular-gigs-location')
  assert.equal(await chip.getAttribute('data-location-mode'), 'choose')
  assert.match(await chip.innerText(), /Choose a city/i)
  assert.equal(
    await page.getByTestId('popular-gigs-subtext').innerText(),
    'Everyday jobs neighbors post nearby.',
  )
  const mobile = page.getByTestId('popular-gigs-see-all-mobile')
  assert.equal((await mobile.innerText()).replace(/\s+/g, ' ').trim(), 'See all jobs near you')
  assert.doesNotMatch(await mobile.innerText(), /near Nearby/i)
}

async function assertCityCopy(page, city = 'Austin') {
  const section = page.getByTestId('popular-gigs')
  assert.equal(await section.getAttribute('data-has-city'), 'true')
  const heading = await page.locator('#popular-gigs-heading').innerText()
  assert.match(heading, new RegExp(`Popular gigs near\\s+${city}`, 'i'))
  assert.doesNotMatch(heading, /Popular gigs near you/i)
  assert.doesNotMatch(heading, /near\s+Nearby/i)
  const chip = page.getByTestId('popular-gigs-location')
  assert.equal(await chip.getAttribute('data-location-mode'), 'city')
  assert.match(await chip.innerText(), new RegExp(city, 'i'))
  assert.equal(
    await page.getByTestId('popular-gigs-subtext').innerText(),
    `Everyday jobs neighbors post around ${city}.`,
  )
  // Mobile CTA is in the DOM whenever the grid has cards (CSS hides on desktop).
  assert.ok(
    (await page.getByTestId('popular-gig-card').count()) > 0,
    'city state should show real jobs in-radius',
  )
  const mobile = page.getByTestId('popular-gigs-see-all-mobile')
  assert.equal(
    (await mobile.innerText()).replace(/\s+/g, ' ').trim(),
    `See all jobs near ${city}`,
  )
}

async function main() {
  const browser = await chromium.launch()

  // --- Unset / Nearby ---
  for (const [width, height, name] of [
    [1440, 900, '1440-unset'],
    [390, 844, '390-unset'],
  ]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.addInitScript((key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }, BROWSE_LOCATION_STORAGE_KEY)
    await page.setViewportSize({ width, height })
    await page.goto(`${BASE}/?gigsLoc=unset`, { waitUntil: 'networkidle' })
    await waitGigs(page)
    await assertUnsetCopy(page)
    await page.locator('[data-testid="popular-gigs"]').scrollIntoViewIfNeeded()
    await shot(page, name)
    await context.close()
  }

  // --- City selected ---
  for (const [width, height, name] of [
    [1440, 900, '1440-city'],
    [390, 844, '390-city'],
  ]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.addInitScript(
      ({ key, pin }) => {
        try {
          localStorage.setItem(key, JSON.stringify(pin))
        } catch {
          /* ignore */
        }
      },
      { key: BROWSE_LOCATION_STORAGE_KEY, pin: AUSTIN_PIN },
    )
    await page.setViewportSize({ width, height })
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await waitGigs(page)
    await assertCityCopy(page, 'Austin')
    await page.locator('[data-testid="popular-gigs"]').scrollIntoViewIfNeeded()
    await shot(page, name)
    await context.close()
  }

  console.log('popular-gigs-nearby-copy-qa passed')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
