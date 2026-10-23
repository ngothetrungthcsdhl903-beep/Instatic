/**
 * Chrome stays on the compositor. Fake glass is a cached texture plus
 * gradients from design-system/tokens.css — never backdrop-filter.
 */

import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const SRC_ROOT = join(import.meta.dir, '../..')
const SCAN_ROOTS = [join(SRC_ROOT, 'admin'), join(SRC_ROOT, 'ui'), join(SRC_ROOT, 'styles')]

function collectCss(dir: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...collectCss(full))
    else if (extname(entry) === '.css') files.push(full)
  }
  return files
}

describe('fake glass — no backdrop-filter in UI chrome', () => {
  it('admin, ui, and style CSS do not blur the backdrop', () => {
    const offenders: string[] = []
    for (const root of SCAN_ROOTS) {
      for (const file of collectCss(root)) {
        const lines = readFileSync(file, 'utf8').split('\n')
        lines.forEach((line, index) => {
          const trimmed = line.trim()
          if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return
          if (/backdrop-filter\s*:/.test(line)) {
            offenders.push(`  ${relative(SRC_ROOT, file)}:${index + 1}`)
          }
        })
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'backdrop-filter is not used on Keijam chrome.\n' +
          'Use [data-k-material] and the --k-material-* tokens instead.\n\n' +
          offenders.join('\n'),
      )
    }
    expect(offenders).toEqual([])
  })
})
