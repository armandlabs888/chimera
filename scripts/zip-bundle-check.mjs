#!/usr/bin/env node
/**
 * Ensure the ZIP gazetteer is not shipped in client bundles.
 * Run after `npm run build`.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), '.next')
const needles = [
  // Known ZCTA row fragment from us-zips.v1.json
  '["95124",37.256831,-121.922815',
  '["95125",37.296',
]

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ent of entries) {
    const path = join(dir, ent.name)
    if (ent.isDirectory()) {
      // Client chunks live under static/; also scan full .next for safety.
      walk(path, out)
      continue
    }
    if (!/\.(js|css|json)$/.test(ent.name)) continue
    // Skip the huge build manifests / traces that may reference source paths.
    if (ent.name === 'trace' || ent.name.endsWith('.nft.json')) continue
    out.push(path)
  }
  return out
}

const staticDir = join(root, 'static')
assert.ok(
  (() => {
    try {
      return statSync(staticDir).isDirectory()
    } catch {
      return false
    }
  })(),
  'Run npm run build before zip-bundle-check (missing .next/static)',
)

const clientFiles = walk(staticDir)
const hits = []
for (const file of clientFiles) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const needle of needles) {
    if (text.includes(needle)) {
      hits.push(`${file} contains ${needle}`)
    }
  }
}

assert.equal(
  hits.length,
  0,
  `ZIP gazetteer leaked into client chunks:\n${hits.join('\n')}`,
)

// Positive control: server chunks / build output may include the data.
const serverFiles = walk(join(root, 'server'))
const serverHas =
  serverFiles.some((f) => {
    try {
      const text = readFileSync(f, 'utf8')
      return needles.some((n) => text.includes(n))
    } catch {
      return false
    }
  }) ||
  (() => {
    try {
      return readFileSync(join(process.cwd(), 'src/data/us-zips.v1.json'), 'utf8').includes(
        needles[0],
      )
    } catch {
      return false
    }
  })()

assert.ok(serverHas, 'expected ZIP data to exist server-side / in source')
console.log(
  `zip-bundle-check PASS (${clientFiles.length} client files scanned, no gazetteer rows)`,
)
