#!/usr/bin/env node
/**
 * Assert Available services section is gone; screenshot How it works → Why HouseCall.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts/remove-available-services'
mkdirSync(OUT, { recursive: true })
mkdirSync('artifacts/remove-available-services', { recursive: true })

async function shot(page, name, fullPage = false) {
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, fullPage })
  await page.screenshot({
    path: `artifacts/remove-available-services/${name}.png`,
    fullPage,
  })
  console.log(`saved ${path}`)
}

async function assertRemoved(page) {
  assert.equal(await page.getByTestId('available-services').count(), 0)
  assert.equal(await page.locator('#neighborhoods').count(), 0)
  assert.equal(await page.getByText(/Explore all six/i).count(), 0)
  assert.equal(await page.getByText(/Available services on HouseCall/i).count(), 0)
  const footer = page.getByTestId('landing-footer')
  assert.equal(await footer.getByRole('link', { name: /^Available services$/i }).count(), 0)
  assert.ok(await page.getByTestId('how-it-works').count() >= 1)
  assert.ok(await page.getByTestId('why-beam-section').count() >= 1)
  assert.ok(await page.getByTestId('landing-categories').count() >= 1)

  const order = await page.evaluate(() => {
    const how = document.querySelector('[data-testid="how-it-works"]')
    const why = document.querySelector('[data-testid="why-beam-section"]')
    if (!how || !why) return null
    const position = how.compareDocumentPosition(why)
    return {
      whyAfterHow: (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      between: (() => {
        let n = how.nextElementSibling
        const ids = []
        while (n && n !== why) {
          ids.push(n.id || n.getAttribute('data-testid') || n.tagName)
          n = n.nextElementSibling
        }
        return ids
      })(),
    }
  })
  assert.ok(order?.whyAfterHow, 'Why HouseCall follows How it works')
  assert.deepEqual(order.between, [], `no leftover section between how→why: ${JSON.stringify(order.between)}`)
}

async function main() {
  const browser = await chromium.launch()

  for (const [width, height, prefix] of [
    [1440, 900, 'd1440'],
    [390, 844, 'm390'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await assertRemoved(page)

    await page.getByTestId('how-it-works').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, `${prefix}-after-flow`)

    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, `${prefix}-full`, true)

    await page.getByTestId('landing-footer').scrollIntoViewIfNeeded()
    await shot(page, `${prefix}-footer`)
    await page.close()
  }

  console.log('remove-available-services-qa passed')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
