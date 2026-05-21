#!/usr/bin/env node
/**
 * i18n coverage checker — finds t('key') calls whose keys are missing from
 * the translation catalog.
 *
 * Warning-mode: exits 0 with a report when the catalog doesn't exist yet.
 * Error-mode (--strict): exits 1 when catalog exists and missing keys are
 * found.
 *
 * Exemptions: add  // i18n-ignore  on the same line as a t() call, or add
 * key prefixes to EXEMPTED_PREFIXES below.
 */

import { readFileSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { globSync } from 'glob'

const STRICT = process.argv.includes('--strict')

const EXEMPTED_PREFIXES = [
  'aria.',
  'error.code.',
]

const CATALOG_CANDIDATES = [
  'public/locales/en/translation.json',
  'src/i18n/en.json',
  'src/locales/en.json',
]

const ROOT = new URL('..', import.meta.url).pathname

function findCatalog() {
  for (const candidate of CATALOG_CANDIDATES) {
    const full = join(ROOT, candidate)
    if (existsSync(full)) return { path: full, rel: candidate }
  }
  return null
}

function flattenKeys(obj, prefix = '') {
  const keys = new Set()
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) {
      for (const nested of flattenKeys(v, full)) keys.add(nested)
    } else {
      keys.add(full)
    }
  }
  return keys
}

function extractTKeys(src) {
  const lines = src.split('\n')
  const keys = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('// i18n-ignore')) continue
    const re = /\bt\(\s*(['"`])([^'"`\s]+)\1/g
    let m
    while ((m = re.exec(line)) !== null) {
      keys.push({ key: m[2], line: i + 1 })
    }
  }
  return keys
}

function isExempted(key) {
  return EXEMPTED_PREFIXES.some((p) => key.startsWith(p))
}

const catalogEntry = findCatalog()

if (!catalogEntry) {
  console.log('[i18n-coverage] No translation catalog found.')
  console.log('  Checked:', CATALOG_CANDIDATES.join(', '))
  console.log('  Status: WARNING-MODE — pass (catalog not yet configured).')
  console.log('  Once react-i18next ships, catalog will be picked up automatically.')
  process.exit(0)
}

const catalog = JSON.parse(readFileSync(catalogEntry.path, 'utf8'))
const knownKeys = flattenKeys(catalog)

console.log(`[i18n-coverage] Catalog: ${catalogEntry.rel} (${knownKeys.size} keys)`)

const files = globSync('src/**/*.{ts,tsx}', { cwd: ROOT, absolute: true })
const missing = []
const usedKeys = new Set()

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const { key, line } of extractTKeys(src)) {
    usedKeys.add(key)
    if (!knownKeys.has(key) && !isExempted(key)) {
      missing.push({ file: relative(ROOT, file), line, key })
    }
  }
}

const unused = [...knownKeys].filter((k) => !usedKeys.has(k) && !isExempted(k))

console.log(`[i18n-coverage] ${files.length} files scanned, ${usedKeys.size} unique t() keys referenced.`)

if (missing.length > 0) {
  console.log(`\nMISSING (${missing.length}) — in code, absent from catalog:`)
  for (const { file, line, key } of missing) {
    console.log(`  ${file}:${line}  "${key}"`)
  }
}

if (unused.length > 0) {
  console.log(`\nUNUSED (${unused.length}) — in catalog, never referenced:`)
  for (const key of unused) console.log(`  "${key}"`)
}

if (missing.length === 0 && unused.length === 0) {
  console.log('[i18n-coverage] All keys accounted for.')
}

if (missing.length > 0) {
  if (STRICT) {
    console.error('\n[i18n-coverage] FAIL — missing keys (--strict).')
    process.exit(1)
  }
  console.warn('\n[i18n-coverage] WARNING — missing keys (warning-mode; add --strict to fail CI).')
}

process.exit(0)
