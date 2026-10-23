import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

describe('Keijam design tokens', () => {
  it('passes the design-system contrast check', () => {
    const result = spawnSync('python3', ['check.py'], {
      cwd: join(root, 'design-system'),
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('FAILS 0')
    expect(result.stdout).toContain('control-border')
  })

  it('ships fake glass with no backdrop blur', () => {
    const css = readFileSync(join(root, 'design-system/tokens.css'), 'utf8')
    expect(css).toContain('--k-material-regular-blur: 0px;')
    expect(css).toContain('--k-material-thin-blur: 0px;')
    expect(css).toContain('--k-material-thick-blur: 0px;')
    expect(css).toContain("--k-material-regular-noise: url('/brand/noise.png');")
    expect(css).toContain('--k-material-regular-sheen:')
    expect(css).not.toContain('backdrop-filter')
    expect(css).toContain('--k-color-control-border:')
  })
})
