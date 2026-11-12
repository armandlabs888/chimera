#!/usr/bin/env node
/**
 * Formerly asserted the Available services 3×2 grid.
 * That section was removed — this script now verifies absence.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })

assert.equal(await page.getByTestId('available-services').count(), 0, 'section removed')
assert.equal(await page.locator('#neighborhoods').count(), 0, 'anchor removed')
assert.equal(await page.getByText(/Explore all six/i).count(), 0)
assert.equal(await page.getByText(/Available services on Beam/i).count(), 0)
assert.equal(
  await page.getByTestId('landing-footer').getByRole('link', { name: /^Available services$/i }).count(),
  0,
  'footer link removed',
)
assert.ok(await page.getByTestId('how-it-works').count() >= 1)
assert.ok(await page.getByTestId('why-beam-section').count() >= 1)

console.log('available-services-qa: section confirmed removed')
await browser.close()
