#!/usr/bin/env node
/**
 * Regenerate src/data/real-names/*.json from public-domain sources.
 *
 * Env (optional overrides):
 *   SSA_DIR     directory of yobYYYY.txt (default /tmp/name-data/ssa)
 *   CENSUS_CSV  Names_2010Census.csv path
 *   ENGLISH_TXT google 20k words path
 *   INTL_TXT    international first-names path
 *
 * See src/data/real-names/SOURCES.txt
 */
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src/data/real-names')
const ssaDir = process.env.SSA_DIR || '/tmp/name-data/ssa'
const censusCsv = process.env.CENSUS_CSV || '/tmp/name-data/Names_2010Census.csv'
const englishTxt = process.env.ENGLISH_TXT || '/tmp/name-data/english-20k.txt'
const intlTxt = process.env.INTL_TXT || '/tmp/name-data/intl-first.txt'

const NAME_RE = /^[a-z]+(?:['-][a-z]+)*$/

function writeJson(path, obj) {
  writeFileSync(path, `${JSON.stringify(obj, null, 0)}\n`, 'utf8')
  console.log('wrote', path)
}

const meta = {
  version: 1,
  sources: [
    'US SSA Baby Names national data (yobYYYY.txt), all years, names with total count >= 5. Public domain. Mirror: archive.org names_202502.',
    'International given names: smashew/NameDatabases first names/all.txt (free to use).',
    'US Census Bureau 2010 Census surnames (Names_2010Census.csv). Public domain.',
    'Google 20k English word frequency list (first20hours/google-10000-english 20k.txt).',
  ],
}

const counts = new Map()
for (const file of readdirSync(ssaDir).filter((f) => /^yob\d{4}\.txt$/.test(f))) {
  for (const line of readFileSync(join(ssaDir, file), 'utf8').split(/\r?\n/)) {
    if (!line) continue
    const [name, , nRaw] = line.split(',')
    const key = (name || '').trim().toLowerCase()
    if (!NAME_RE.test(key)) continue
    const n = Number(nRaw)
    if (!Number.isFinite(n)) continue
    counts.set(key, (counts.get(key) || 0) + n)
  }
}
const ssaFirst = [...counts.entries()].filter(([, c]) => c >= 5).map(([n]) => n)

const intl = readFileSync(intlTxt, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim().toLowerCase())
  .filter((n) => NAME_RE.test(n))

const firstNames = [...new Set([...ssaFirst, ...intl])].sort()

const surnames = []
{
  const text = readFileSync(censusCsv, 'utf8')
  const lines = text.split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const name = line.split(',')[0].trim().toLowerCase()
    if (!name || name === 'allothernames') continue
    if (NAME_RE.test(name)) surnames.push(name)
  }
}
surnames.sort()
const surnameSet = new Set(surnames)

const english = []
const englishSeen = new Set()
for (const line of readFileSync(englishTxt, 'utf8').split(/\r?\n/)) {
  const w = line.trim().toLowerCase()
  if (!/^[a-z]{2,}$/.test(w) || englishSeen.has(w)) continue
  englishSeen.add(w)
  english.push(w)
}

const firstSet = new Set(firstNames)
const givenEnglish = [...firstSet].filter((n) => englishSeen.has(n)).sort()
const surnameEnglish = [...surnameSet].filter((n) => englishSeen.has(n)).sort()

mkdirSync(outDir, { recursive: true })
writeJson(join(outDir, 'first-names.v1.json'), { meta, names: firstNames })
writeJson(join(outDir, 'surnames.v1.json'), { meta, names: surnames })
writeJson(join(outDir, 'english-words.v1.json'), { meta, words: english })
writeJson(join(outDir, 'lexicon.v1.json'), {
  meta: {
    version: 1,
    note: 'Derived runtime lexicon: english words + english∩given + english∩surname.',
    sources: meta.sources,
  },
  english,
  givenEnglish,
  surnameEnglish,
})

console.log({
  firstNames: firstNames.length,
  surnames: surnames.length,
  english: english.length,
  givenEnglish: givenEnglish.length,
  surnameEnglish: surnameEnglish.length,
})
