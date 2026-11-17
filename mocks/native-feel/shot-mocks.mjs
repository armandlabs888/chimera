#!/usr/bin/env node
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

const screens = [
  ['browse.html', 'mock_browse_390x844.png'],
  ['job-sheet.html', 'mock_job_sheet_390x844.png'],
  ['job-push.html', 'mock_job_push_390x844.png'],
  ['post.html', 'mock_post_390x844.png'],
  ['messages.html', 'mock_messages_390x844.png'],
  ['conversation.html', 'mock_conversation_390x844.png'],
  ['profile.html', 'mock_profile_390x844.png'],
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 420, height: 900 },
  deviceScaleFactor: 2,
})

for (const [file, outName] of screens) {
  const url = `file://${join(__dirname, file)}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const phone = page.locator('#shot')
  await phone.screenshot({ path: join(OUT, outName) })
  console.log('saved', outName)
}

await browser.close()
