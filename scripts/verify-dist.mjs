/**
 * verify-dist.mjs
 *
 * Post-build sanity check: every absolute asset reference inside
 * dist/index.html must begin with the GitHub Pages base URL
 * (/souls-tracker-utility/).  Run automatically via `npm run verify:dist`
 * after `npm run build`.
 *
 * Exit code 0 = all paths are correctly prefixed.
 * Exit code 1 = one or more paths are missing the prefix (would 404 on Pages).
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = '/souls-tracker-utility/'
const distDir = 'dist'
const indexPath = join(distDir, 'index.html')

if (!existsSync(indexPath)) {
  console.error('❌  dist/index.html not found. Run `npm run build` first.')
  process.exit(1)
}

const html = readFileSync(indexPath, 'utf8')

// Collect every href="…" and src="…" attribute value that starts with /
const assetRefs = [...html.matchAll(/(?:href|src)="(\/[^"]+)"/g)].map(
  (m) => m[1],
)

const invalid = assetRefs.filter((ref) => !ref.startsWith(BASE))

if (invalid.length > 0) {
  console.error('❌  Asset paths not prefixed with base URL', BASE)
  for (const p of invalid) {
    console.error('   ', p)
  }
  process.exit(1)
}

console.log('✓  All asset paths are correctly prefixed with', BASE)
for (const p of assetRefs) {
  console.log('   ', p)
}
