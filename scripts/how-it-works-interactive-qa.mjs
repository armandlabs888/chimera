#!/usr/bin/env node
/**
 * How it works (Landing v2) — static tinted 3-step band QA.
 * Retains contrast + copy locks; interactive tabs retired with v2 mockup.
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? process.env.BEAM_BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/how-it-works-qa'
mkdirSync(OUT, { recursive: true })

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a, b) {
  const L1 = relativeLuminance(a)
  const L2 = relativeLuminance(b)
  const hi = Math.max(L1, L2)
  const lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.locator('#how-it-works').scrollIntoViewIfNeeded()
    const structure = await page.evaluate(() => {
      const section = document.querySelector('#how-it-works')
      const steps = section?.querySelector('[data-testid="how-it-works-steps"]')
      const headings = [...(steps?.querySelectorAll('h3') || [])].map((h) => h.textContent?.trim())
      return {
        heading: section?.querySelector('h2')?.textContent?.trim() || '',
        headings,
        tabCount: section?.querySelectorAll('[role="tab"]').length || 0,
        stepCount: headings.length,
        hasBest: /BEST/i.test(section?.innerText || ''),
      }
    })
    assert.match(structure.heading, /From to-do to done/i)
    assert.equal(structure.stepCount, 3, 'three how-it-works steps')
    assert.equal(structure.tabCount, 0, 'v2 how-it-works is non-interactive (no tabs)')
    assert.equal(structure.hasBest, false, 'no BEST badge')
    assert.ok(structure.headings.some((h) => /Post your task/i.test(h || '')))
    assert.ok(structure.headings.some((h) => /Compare offers/i.test(h || '')))
    assert.ok(structure.headings.some((h) => /Chat, finish/i.test(h || '')))

    const contrast = await page.evaluate(() => {
      const h2 = document.querySelector('#how-it-works h2')
      if (!h2) return null
      const cs = getComputedStyle(h2)
      const color = cs.color.match(/\d+/g)?.map(Number) || [0, 0, 0]
      let el = h2
      let bg = [255, 255, 255]
      while (el) {
        const b = getComputedStyle(el).backgroundColor
        const m = b.match(/\d+/g)?.map(Number)
        if (m && m.length >= 3 && !b.includes('rgba(0, 0, 0, 0)')) {
          bg = m.slice(0, 3)
          break
        }
        el = el.parentElement
      }
      return { color, bg }
    })
    assert.ok(contrast, 'how-it-works heading measurable')
    const ratio = contrastRatio(contrast.color, contrast.bg)
    assert.ok(ratio >= 4.5, `how-it-works heading contrast ${ratio.toFixed(2)} >= 4.5`)

    await page.locator('#how-it-works').screenshot({ path: join(OUT, 'desktop-1440.png') })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('#how-it-works').scrollIntoViewIfNeeded()
    await page.locator('#how-it-works').screenshot({ path: join(OUT, 'mobile-390.png') })
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.locator('#how-it-works').scrollIntoViewIfNeeded()
    await page.locator('#how-it-works').screenshot({ path: join(OUT, 'tablet-768.png') })

    writeFileSync(
      join(OUT, 'summary.json'),
      JSON.stringify({ ok: true, structure, contrast: ratio }, null, 2),
    )
    console.log('ok how-it-works-qa (landing v2 static steps)')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
