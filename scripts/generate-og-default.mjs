#!/usr/bin/env node
/**
 * Regenerate public/images/og-default.png from the live /opengraph-image route.
 * Requires a running Next.js server (or pass BASE_URL).
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.env.BASE_URL || 'http://127.0.0.1:43123'
const out = join(root, 'public/images/og-default.png')

const res = await fetch(`${base}/opengraph-image`)
if (!res.ok) {
  console.error(`Failed to fetch opengraph-image: ${res.status}`)
  process.exit(1)
}
const buf = Buffer.from(await res.arrayBuffer())
if (buf.length < 1000 || buf[0] !== 0x89) {
  console.error('Response does not look like a PNG')
  process.exit(1)
}
writeFileSync(out, buf)
console.log(`Wrote ${out} (${buf.length} bytes)`)
