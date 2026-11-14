#!/usr/bin/env node
/**
 * Before/after screenshots for the shared social profile header.
 * Captures neighbor /you, helper /you, and public /people/[id]
 * at 1280 desktop and 390 mobile viewports.
 *
 * Usage:
 *   PHASE=before node scripts/profile-header-shots.mjs
 *   PHASE=after  node scripts/profile-header-shots.mjs
 */
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const PHASE = process.env.PHASE || 'before'
const SUFFIX = process.env.SUFFIX ? `-${process.env.SUFFIX}` : ''
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/profile-header'
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

async function seedRole(page, role) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, role: nextRole }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        if (nextRole === 'helper') {
          p.accountRole = 'helper'
          p.isHelper = true
          p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
          p.hourlyRate = p.hourlyRate || 35
          p.rateType = p.rateType || 'hourly'
          p.serviceRadiusMiles = p.serviceRadiusMiles || 5
          p.availableNow = true
          p.availability = p.availability?.length ? p.availability : ['afternoons', 'evenings']
          p.rating = p.rating > 0 ? p.rating : 4.9
          p.reviewCount = Math.max(p.reviewCount || 0, 12)
          p.jobsCompleted = Math.max(p.jobsCompleted || 0, 18)
          p.locationLabel = p.locationLabel || 'East Austin, TX'
          p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-03-12T12:00:00.000Z'
        } else {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
          p.availableNow = false
          p.availability = []
          p.hourlyRate = 0
          p.locationLabel = p.locationLabel || 'East Austin, TX'
          p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z'
        }
      }
      // Ensure the current user has at least one posted request for neighbor stats.
      if (nextRole === 'neighbor') {
        const requests = state.requests || []
        const mine = requests.filter((r) => r.requesterId === me)
        if (!mine.length) {
          requests.push({
            id: 'req-qa-neighbor-stat',
            title: 'Help moving a bookshelf',
            details: 'Need two people for a short move upstairs.',
            category: 'junk-removal',
            neighborhood: 'east-austin',
            when: 'this-week',
            whenLabel: 'This week',
            budget: 60,
            status: 'open',
            requesterId: me,
            image: '',
            images: [],
            createdAt: new Date().toISOString(),
            locationLabel: 'East Austin, TX',
          })
          state.requests = requests
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
}

async function seedNeighborViewer(page) {
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
          p.availableNow = false
          p.availability = []
          p.hourlyRate = 0
          p.locationLabel = p.locationLabel || 'East Austin, TX'
        }
        if (p.id === helperId) {
          if (!p.avatar) {
            p.avatar =
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80'
          }
          p.rating = p.rating > 0 ? p.rating : 5
          p.reviewCount = Math.max(p.reviewCount || 0, 1)
          p.jobsCompleted = Math.max(p.jobsCompleted || 0, 1)
          p.availableNow = true
          p.availability = p.availability?.length ? p.availability : ['mornings', 'afternoons']
          p.serviceRadiusMiles = p.serviceRadiusMiles || 5
          p.rateType = 'hourly'
          p.hourlyRate = p.hourlyRate || 40
          p.isHelper = true
          p.locationLabel = p.locationLabel || 'Hyde Park, Austin'
        }
      }
      const reviews = state.reviews || []
      if (!reviews.some((r) => r.toId === helperId)) {
        reviews.push({
          id: 'rev-qa-maya',
          requestId: 'req-past-2',
          fromId: 'p-jordan',
          toId: helperId,
          rating: 5,
          comment: 'Clear explanations and on time. Would book again.',
          createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        })
        state.reviews = reviews
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID },
  )
}

const VIEWS = [
  { name: 'desk', width: 1280, height: 800 },
  { name: 'mob', width: 390, height: 844, isMobile: true },
]

async function captureYou(browser, role, label) {
  for (const vp of VIEWS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: Boolean(vp.isMobile),
      hasTouch: Boolean(vp.isMobile),
    })
    const page = await context.newPage()
    await seedRole(page, role)
    await page.goto(`${BASE}/you?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.getByTestId('you-page').waitFor({ state: 'visible', timeout: 20000 })
    await page.waitForTimeout(300)
    await shot(page, `profile-header-${PHASE}${SUFFIX}-${label}-${vp.name}.png`)
    await context.close()
  }
}

async function capturePublic(browser) {
  for (const vp of VIEWS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: Boolean(vp.isMobile),
      hasTouch: Boolean(vp.isMobile),
    })
    const page = await context.newPage()
    await seedNeighborViewer(page)
    await page.goto(`${BASE}/people/${HELPER_ID}?demo=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.getByTestId('public-helper-profile').waitFor({ state: 'visible', timeout: 20000 })
    await page.waitForTimeout(300)
    await shot(page, `profile-header-${PHASE}${SUFFIX}-public-helper-${vp.name}.png`)
    await context.close()
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    await captureYou(browser, 'neighbor', 'neighbor-own')
    await captureYou(browser, 'helper', 'helper-own')
    await capturePublic(browser)
    console.log(`profile-header-shots ${PHASE} done`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
